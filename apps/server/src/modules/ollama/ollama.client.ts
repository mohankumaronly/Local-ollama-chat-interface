import { env } from '../../config/env.js';

export type OllamaChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OllamaStreamChunk =
  | { type: 'token'; text: string }
  | { type: 'done' };

export async function* streamOllamaChat(
  messages: OllamaChatMessage[],
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<OllamaStreamChunk> {
  const res = await fetch(`${env.OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama error ${res.status}: ${text.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Ollama streams newline-delimited JSON (one object per line)
    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;

      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue; // ignore malformed keepalive lines
      }

      if (obj.done) {
        yield { type: 'done' };
        return;
      }

      const text = obj.message?.content;
      if (typeof text === 'string' && text.length > 0) {
        yield { type: 'token', text };
      }
    }
  }

  // Buffer may hold a final partial line
  const tail = buffer.trim();
  if (tail) {
    try {
      const obj = JSON.parse(tail);
      const text = obj.message?.content;
      if (typeof text === 'string' && text.length > 0) {
        yield { type: 'token', text };
      }
    } catch {
      /* ignore */
    }
  }
  yield { type: 'done' };
}
