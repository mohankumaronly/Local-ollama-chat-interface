import type { Request, Response } from 'express';
import { z } from 'zod';
import { streamChat } from './chat.service.js';
import * as repo from './chat.repo.js';
import { env } from '../../config/env.js';
import { isAllowedOllamaUrl, ensureModelAvailable } from '../ollama/ollama.client.js';

const ChatBody = z.object({
  chatId: z.number().int().positive().optional(),
  message: z.string().min(1, 'message required').max(32_000),
  model: z.string().min(1).default('llama3.2'),
  // Optional: client-supplied Ollama target. Omit to use env.OLLAMA_URL.
  ollamaUrl: z.string().url().optional(),
});

export async function postChat(req: Request, res: Response): Promise<void> {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    return;
  }

  const { chatId, message, model, ollamaUrl } = parsed.data;

  // Resolve target: validated client override or env default (backward-compat)
  let baseUrl = env.OLLAMA_URL;
  if (ollamaUrl) {
    if (!isAllowedOllamaUrl(ollamaUrl)) {
      res.status(400).json({
        error: 'URL not allowed',
        message: `Hostname must match OLLAMA_ALLOWED_HOSTS. Allowed: ${env.OLLAMA_ALLOWED_HOSTS.join(', ')}`,
      });
      return;
    }
    baseUrl = ollamaUrl.replace(/\/+$/, ''); // strip trailing slashes
  }

  // Fail fast before opening SSE if model isn't on the target
  try {
    await ensureModelAvailable(baseUrl, model);
  } catch (err) {
    res.status(400).json({
      error: 'Model unavailable',
      message: (err as Error).message,
    });
    return;
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // prevent nginx/CDN buffering
  res.flushHeaders();

  const abort = new AbortController();
  // Abort the Ollama stream only if the CLIENT disconnects before we finish.
  res.on('close', () => {
    if (!res.writableEnded) abort.abort();
  });

  const send = (event: unknown): void => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    for await (const ev of streamChat({
      chatId,
      userMessage: message,
      model,
      baseUrl,
      signal: abort.signal,
    })) {
      send(ev);
    }
  } catch (err) {
    send({ type: 'error', message: (err as Error).message });
  } finally {
    res.end();
  }
}

export async function listChatsHandler(_req: Request, res: Response): Promise<void> {
  const rows = await repo.listChats();
  res.json(rows);
}

export async function getMessagesHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid chat id' });
    return;
  }
  const chat = await repo.getChat(id);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }
  const msgs = await repo.listMessages(id);
  res.json({ chat, messages: msgs });
}
