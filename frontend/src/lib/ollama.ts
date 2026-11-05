import type {
  Message,
  MessageStats,
  OllamaChatChunk,
  OllamaModel,
  OllamaTagsResponse,
} from '../types';

/** Default endpoint, overridable at build time via VITE_OLLAMA_URL. */
export const DEFAULT_OLLAMA_URL =
  (import.meta.env.VITE_OLLAMA_URL as string | undefined) ??
  'http://localhost:11434';

/** Normalize a user-entered URL: trim, drop trailing slashes. */
export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Basic client-side validation for an HTTP(S) endpoint. */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(normalizeUrl(url));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * GET /api/tags — list installed models.
 * Throws a descriptive error on failure.
 */
export async function listModels(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<OllamaModel[]> {
  const res = await fetch(`${normalizeUrl(baseUrl)}/api/tags`, { signal });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Authentication required (${res.status}). This endpoint needs a token/proxy auth.`,
      );
    }
    throw new Error(`Ollama /api/tags failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as OllamaTagsResponse;
  return data.models ?? [];
}

/**
 * Lightweight health check with a timeout. Returns true if /api/tags responds OK.
 * Never throws — always resolves to a boolean.
 */
export async function checkHealth(
  baseUrl: string,
  timeoutMs = 8000,
): Promise<boolean> {
  if (!isValidUrl(baseUrl)) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${normalizeUrl(baseUrl)}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export interface StreamProgress {
  /** Tokens received so far (server eval_count when available, else heuristic). */
  tokens: number;
  /** Seconds elapsed since the first token arrived. */
  elapsedMs: number;
  /** Live tokens/second. */
  tokensPerSecond: number;
}

export interface StreamChatOptions {
  baseUrl: string;
  model: string;
  messages: Pick<Message, 'role' | 'content'>[];
  signal?: AbortSignal;
  onToken: (text: string) => void;
  /** Fired while streaming with live token/speed estimates. */
  onProgress?: (progress: StreamProgress) => void;
  /** Fired once at the end with authoritative Ollama timing stats. */
  onDone?: (stats: MessageStats) => void;
  options?: {
    temperature?: number;
    num_ctx?: number;
  };
}

/** Rough token estimate when the server hasn't reported counts yet. */
function estimateTokens(text: string): number {
  // ~4 chars per token is a reasonable approximation for English + code.
  return Math.max(1, Math.round(text.length / 4));
}

/** Build final stats from Ollama's done chunk (durations are nanoseconds). */
function buildStats(chunk: OllamaChatChunk, full: string): MessageStats {
  const nsToMs = (ns?: number) => (ns ? ns / 1_000_000 : 0);
  const nsToSec = (ns?: number) => (ns ? ns / 1_000_000_000 : 0);

  const promptTokens = chunk.prompt_eval_count ?? 0;
  const completionTokens = chunk.eval_count ?? estimateTokens(full);
  const evalSec = nsToSec(chunk.eval_duration);
  const promptSec = nsToSec(chunk.prompt_eval_duration);

  const tokensPerSecond =
    evalSec > 0 ? completionTokens / evalSec : 0;
  const promptTokensPerSecond =
    promptSec > 0 ? promptTokens / promptSec : 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    tokensPerSecond,
    promptTokensPerSecond,
    totalMs: nsToMs(chunk.total_duration),
    evalMs: nsToMs(chunk.eval_duration),
  };
}

/**
 * POST /api/chat with streaming enabled.
 * Ollama replies with NDJSON (one JSON object per line), so we buffer
 * raw text and split on newlines to avoid parsing half-lines.
 * Returns the full assistant text once complete.
 */
export async function streamChat({
  baseUrl,
  model,
  messages,
  signal,
  onToken,
  onProgress,
  onDone,
  options,
}: StreamChatOptions): Promise<string> {
  const res = await fetch(`${normalizeUrl(baseUrl)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        temperature: options?.temperature ?? 0.7,
        ...(options?.num_ctx ? { num_ctx: options.num_ctx } : {}),
      },
    }),
  });

  if (!res.ok || !res.body) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Authentication failed (${res.status}). The endpoint requires auth.`,
      );
    }
    throw new Error(
      `Ollama /api/chat failed (${res.status}). Check that the endpoint is reachable ` +
        `and CORS is enabled (OLLAMA_ORIGINS for local, or tunnel config for remote).`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let chunkCount = 0;
  let firstTokenAt = 0;

  // Emit a progress update every N tokens to limit re-renders.
  const PROGRESS_EVERY = 3;
  const emitProgress = () => {
    if (!onProgress || !firstTokenAt) return;
    const elapsedMs = performance.now() - firstTokenAt;
    const elapsedSec = elapsedMs / 1000;
    // Prefer real streamed chunk count; ~1 token per chunk for most models.
    const tokens = chunkCount || estimateTokens(full);
    const tokensPerSecond = elapsedSec > 0 ? tokens / elapsedSec : 0;
    onProgress({ tokens, elapsedMs, tokensPerSecond });
  };

  const handleChunk = (chunk: OllamaChatChunk): boolean => {
    const token = chunk.message?.content ?? '';
    if (token) {
      if (!firstTokenAt) firstTokenAt = performance.now();
      chunkCount += 1;
      full += token;
      onToken(token);
      if (chunkCount % PROGRESS_EVERY === 0) emitProgress();
    }
    if (chunk.done) {
      onDone?.(buildStats(chunk, full));
      return true;
    }
    return false;
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;

        let chunk: OllamaChatChunk;
        try {
          chunk = JSON.parse(line) as OllamaChatChunk;
        } catch {
          continue; // skip malformed partial lines
        }

        if (handleChunk(chunk)) return full;
      }
    }

    // Flush any trailing buffered line that lacked a newline.
    const tail = buffer.trim();
    if (tail) {
      try {
        const chunk = JSON.parse(tail) as OllamaChatChunk;
        handleChunk(chunk);
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }

  return full;
}
