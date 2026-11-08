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

// ============================================================
// Token helpers — read/write from localStorage
// ============================================================

const TOKEN_STORAGE_KEY = 'apiToken';

export function getApiToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setApiToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable (e.g. private browsing with strict settings)
  }
}

export function hasApiToken(): boolean {
  return !!getApiToken();
}

export const getStoredToken = getApiToken;
export const setStoredToken = setApiToken;
export function clearStoredToken(): void {
  setApiToken(null);
}

/**
 * Builds a headers object that includes Authorization if a token is stored.
 * Any extra headers passed in are merged; they can override Authorization
 * (e.g. Content-Type).
 */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getApiToken();
  const headers: Record<string, string> = { ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ============================================================
// Auth verification
// ============================================================

export type VerifyResult =
  | { ok: true; tokenSourceHint: 'env' | 'file' | 'generated' }
  | { ok: false; reason: 'unauthorized' | 'network' | 'server' };

export async function verifyToken(token: string): Promise<VerifyResult> {
  try {
    const res = await fetch('/api/v1/auth/verify', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
      cache: 'no-store',
    });

    if (res.status === 200) {
      const data = (await res.json()) as { ok: boolean; tokenSourceHint?: 'env' | 'file' | 'generated' };
      return { ok: true, tokenSourceHint: data.tokenSourceHint ?? 'file' };
    }

    if (res.status === 401) {
      return { ok: false, reason: 'unauthorized' };
    }

    return { ok: false, reason: 'server' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

// ============================================================
// API calls
// ============================================================

export async function checkBackendHealth(timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Health endpoint is exempt from auth — no authHeaders() needed
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
  const res = await fetch('/api/v1/chats', { headers: authHeaders() });
  if (!res.ok) throw new Error(`listChats failed: ${res.status}`);
  return res.json();
}

export async function getMessages(chatId: number): Promise<MessagesResponse> {
  const res = await fetch(`/api/v1/chats/${chatId}/messages`, { headers: authHeaders() });
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
    headers: authHeaders({ 'Content-Type': 'application/json' }),
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
    const res = await fetch(
      `/api/v1/ollama/test?url=${encodeURIComponent(url)}`,
      { headers: authHeaders() },
    );
    return (await res.json()) as OllamaTestResponse;
  } catch (err) {
    return { ok: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}
