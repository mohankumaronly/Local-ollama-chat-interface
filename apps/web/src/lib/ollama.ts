import type { OllamaModel } from '../types';
import { getApiToken } from './api';

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
 * GET /api/v1/ollama/test — list installed models via the backend proxy.
 * The browser never talks to Ollama directly, eliminating CORS/network issues.
 */
export async function listModels(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<OllamaModel[]> {
  const token = getApiToken();
  const targetUrl = normalizeUrl(baseUrl);
  
  const res = await fetch(`/api/v1/ollama/test?url=${encodeURIComponent(targetUrl)}`, {
    signal,
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Authentication required (${res.status}). Please configure your API token in Settings.`,
      );
    }
    const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errBody.error || `Ollama test failed: ${res.status}`);
  }
  
  const data = await res.json();
  
  // Map string array from backend to OllamaModel object shape
  return (data.models || []).map((name: string) => ({
    name: name,
    model: name,
    modified_at: new Date().toISOString(),
    size: 0,
    digest: '',
    details: {
      parent_model: '',
      format: '',
      family: '',
      families: [],
      parameter_size: '',
      quantization_level: '',
    }
  }));
}

/**
 * Lightweight health check via the backend proxy.
 */
export async function checkHealth(
  baseUrl: string,
  timeoutMs = 8000,
): Promise<boolean> {
  if (!isValidUrl(baseUrl)) return false;
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getApiToken();
  const targetUrl = normalizeUrl(baseUrl);

  try {
    const res = await fetch(`/api/v1/ollama/test?url=${encodeURIComponent(targetUrl)}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}