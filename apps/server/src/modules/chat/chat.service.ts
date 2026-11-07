import type { ServerStreamEvent } from '@local-ollama/shared';
import * as repo from './chat.repo.js';
import { streamOllamaChat, type OllamaChatMessage } from '../ollama/ollama.client.js';

/** @deprecated use ServerStreamEvent from @local-ollama/shared */
export type ChatStreamEvent = ServerStreamEvent;

export type StreamChatParams = {
  chatId?: number;
  userMessage: string;
  model: string;
  signal?: AbortSignal;
};

export async function* streamChat(
  params: StreamChatParams,
): AsyncGenerator<ChatStreamEvent> {
  let chatId = params.chatId;

  // 1. Ensure chat exists
  if (chatId == null) {
    const title =
      params.userMessage.length > 60
        ? params.userMessage.slice(0, 57) + '...'
        : params.userMessage;
    const chat = await repo.createChat(title || 'New chat');
    chatId = chat.id;
    yield { type: 'chat_created', chatId };
  } else {
    const existing = await repo.getChat(chatId);
    if (!existing) {
      yield { type: 'error', message: `Chat ${chatId} not found` };
      return;
    }
  }

  // 2. Persist user message
  await repo.appendMessage(chatId, 'user', params.userMessage);

  // 3. Build prompt from full history
  const history = await repo.listMessages(chatId);
  const ollamaMessages: OllamaChatMessage[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // 4. Stream from Ollama, accumulate text
  let assistantText = '';
  try {
    for await (const chunk of streamOllamaChat(ollamaMessages, params.model, params.signal)) {
      if (chunk.type === 'token') {
        assistantText += chunk.text;
        yield { type: 'token', text: chunk.text };
      }
    }
  } catch (err) {
    yield { type: 'error', message: (err as Error).message };
    // Still persist whatever we got, so user's partial is saved
    if (assistantText.length > 0) {
      const saved = await repo.appendMessage(chatId, 'assistant', assistantText);
      await repo.touchChat(chatId);
      yield { type: 'done', chatId, assistantMessageId: saved.id };
    }
    return;
  }

  // 5. Persist assistant reply + bump updatedAt
  const saved = await repo.appendMessage(chatId, 'assistant', assistantText);
  await repo.touchChat(chatId);
  yield { type: 'done', chatId, assistantMessageId: saved.id };
}
