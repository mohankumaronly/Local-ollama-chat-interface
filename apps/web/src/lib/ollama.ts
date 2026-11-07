import type { OllamaModel, OllamaTagsResponse } from '../types';

/**
 * Direct Ollama helpers. Chat itself now goes through the backend
 * (see lib/api.ts); this module is kept for the model picker and the
 * connection/settings dialog, which talk to Ollama directly.
 */

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
