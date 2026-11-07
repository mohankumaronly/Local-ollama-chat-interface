// Backend client. Talks only to /api/v1/* (proxied to :3000 by Vite in dev).
import type {
  ServerStreamEvent,
  ChatSummary,
  ChatMessage,
  MessagesResponse,
  HealthResponse,
  OllamaTestResponse,
} from '@local-ollama/shared';

// Re-export so existing internal consumers don't need to change their imports.
export type { ServerStreamEvent, ChatSummary, ChatMessage, MessagesResponse, HealthResponse, OllamaTestResponse };

// ServerMessage was the old name for ChatMessage — alias for backwards compat.
export type ServerMessage = ChatMessage;

export async function checkBackendHealth(timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/v1/health', { cache: 'no-store', signal: controller.signal });
    if (!res.ok) return false;
    const body = (await res.json()) as HealthResponse;
    return body.ok === true && body.db === 'up';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function listChats(): Promise<ChatSummary[]> {
  const res = await fetch('/api/v1/chats');
  if (!res.ok) throw new Error(`listChats failed: ${res.status}`);
  return res.json();
}

export async function getMessages(chatId: number): Promise<MessagesResponse> {
  const res = await fetch(`/api/v1/chats/${chatId}/messages`);
  if (!res.ok) throw new Error(`getMessages failed: ${res.status}`);
  return res.json();
}

/**
 * Opens an SSE stream to POST /api/v1/chat and yields parsed events.
 * The caller iterates; abort via the passed AbortSignal.
 */
export async function* streamChatApi(
  params: { chatId?: number; message: string; model: string; ollamaUrl?: string },
  signal?: AbortSignal,
): AsyncGenerator<ServerStreamEvent> {
  const res = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`streamChat failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line (\n\n or \r\n\r\n).
      let sep: number;
      while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const rawFrame = buffer.slice(0, sep);
        const skip = buffer[sep] === '\r' ? 4 : 2;
        buffer = buffer.slice(sep + skip);

        const dataLines: string[] = [];
        for (const line of rawFrame.split(/\r?\n/)) {
          if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        }
        if (dataLines.length === 0) continue;

        try {
          yield JSON.parse(dataLines.join('\n')) as ServerStreamEvent;
        } catch {
          // ignore malformed frame
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Calls the backend's /api/v1/ollama/test?url=<target> endpoint.
 * Returns { ok: true, models } or { ok: false, error }.
 * Never throws — network failures are returned as ok:false.
 */
export async function testOllama(url: string): Promise<OllamaTestResponse> {
  try {
    const res = await fetch(`/api/v1/ollama/test?url=${encodeURIComponent(url)}`);
    return (await res.json()) as OllamaTestResponse;
  } catch (err) {
    return { ok: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}
