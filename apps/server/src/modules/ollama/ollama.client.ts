import { env } from '../../config/env.js';

export type OllamaChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OllamaStreamChunk =
  | { type: 'token'; text: string }
  | { type: 'done' };

/**
 * Returns true iff `raw` is a safe Ollama base URL that the backend is willing
 * to call. Blocks SSRF vectors: non-http(s) schemes, embedded credentials,
 * non-loopback IPv4 literals, and any hostname not matched by OLLAMA_ALLOWED_HOSTS.
 */
export function isAllowedOllamaUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;

  const host = u.hostname.toLowerCase();

  // Reject IPv4 literals unless it's exactly loopback.
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  if (isIpv4 && host !== '127.0.0.1') return false;

  // Reject bracketed IPv6 literals (SSRF-prone, uncommon for Ollama).
  if (host.startsWith('[') || host.includes(':')) return false;

  return env.OLLAMA_ALLOWED_HOSTS.some((pattern) => {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // e.g. ".trycloudflare.com"
      return host.endsWith(suffix) && host.length > suffix.length;
    }
    return host === pattern;
  });
}

/**
 * Translates a user-entered URL to the URL the Docker container can actually reach.
 * If the frontend sends http://localhost:11434, Docker must use host.docker.internal.
 */
/**
 * Translates a user-entered URL to the URL the Docker container can actually reach.
 * If the frontend sends http://localhost:11434, Docker must use host.docker.internal.
 * In native dev mode, this translation is skipped.
 */
function translateUrlForDocker(rawUrl: string): string {
  let url = rawUrl;
  
  // Only translate if explicitly running inside Docker
  if (process.env.DOCKER_ENV === 'true') {
    if (url.includes('localhost')) url = url.replace('localhost', 'host.docker.internal');
    if (url.includes('127.0.0.1')) url = url.replace('127.0.0.1', 'host.docker.internal');
  }
  
  return url;
}

/**
 * GET /api/tags on the given base URL. Throws on HTTP error or network failure.
 * Returned model names are exactly what the target reports.
 */
export async function listModelsFrom(baseUrl: string): Promise<string[]> {
  const targetUrl = translateUrlForDocker(baseUrl);
  const res = await fetch(`${targetUrl}/api/tags`);
  if (!res.ok) {
    throw new Error(`Ollama /api/tags returned ${res.status}`);
  }
  const data = (await res.json()) as { models?: Array<{ name: string }> };
  return (data.models ?? []).map((m) => m.name);
}

/**
 * Ensures `model` exists on the target. Throws an actionable error listing
 * available models if it doesn't.
 */
export async function ensureModelAvailable(
  baseUrl: string,
  model: string,
): Promise<void> {
  const names = await listModelsFrom(baseUrl);
  if (!names.includes(model)) {
    throw new Error(
      `Model '${model}' is not installed on this target. Available: ${
        names.join(', ') || '(none)'
      }`,
    );
  }
}

/**
 * Streams a chat completion from `baseUrl`. The path is fixed at /api/chat —
 * callers cannot smuggle arbitrary paths. Requires explicit baseUrl so the
 * same function works for both local and remote (tunnel) targets.
 */
export async function* streamOllamaChat(
  baseUrl: string,
  messages: OllamaChatMessage[],
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<OllamaStreamChunk> {
  const targetUrl = translateUrlForDocker(baseUrl);
  
  const res = await fetch(`${targetUrl}/api/chat`, {
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

      let obj: unknown;
      try {
        obj = JSON.parse(line);
      } catch {
        continue; // ignore malformed keepalive lines
      }

      const o = obj as Record<string, unknown>;
      if (o['done']) {
        yield { type: 'done' };
        return;
      }
      const msg = o['message'] as Record<string, unknown> | undefined;
      const text = msg?.['content'];
      if (typeof text === 'string' && text.length > 0) {
        yield { type: 'token', text };
      }
    }
  }

  // Buffer may hold a final partial line
  const tail = buffer.trim();
  if (tail) {
    try {
      const obj = JSON.parse(tail) as Record<string, unknown>;
      const msg = obj['message'] as Record<string, unknown> | undefined;
      const text = msg?.['content'];
      if (typeof text === 'string' && text.length > 0) {
        yield { type: 'token', text };
      }
    } catch {
      /* ignore */
    }
  }
  yield { type: 'done' };
}