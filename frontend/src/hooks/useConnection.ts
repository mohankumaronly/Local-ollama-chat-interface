import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_OLLAMA_URL,
  checkHealth,
  isValidUrl,
  listModels,
  normalizeUrl,
} from '../lib/ollama';
import type { OllamaModel } from '../types';

const STORAGE_KEY = 'ollama-chat-endpoint';

export type ConnectionStatus = 'checking' | 'online' | 'offline';

export interface ConnectionState {
  /** Active base URL (normalized). */
  baseUrl: string;
  status: ConnectionStatus;
  models: OllamaModel[];
  /** Human-readable error from the last failed attempt, if any. */
  error: string | null;
  /** Whether models are being loaded. */
  loadingModels: boolean;
  /** Persist a new endpoint and re-check. Returns false if URL is invalid. */
  setEndpoint: (url: string) => boolean;
  /** Re-run the health check + model load for the current endpoint. */
  retry: () => void;
  /** Reset to the default local endpoint. */
  reset: () => void;
}

function loadSavedEndpoint(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isValidUrl(saved)) return normalizeUrl(saved);
  } catch {
    // localStorage unavailable
  }
  return normalizeUrl(DEFAULT_OLLAMA_URL);
}

export function useConnection(): ConnectionState {
  const [baseUrl, setBaseUrl] = useState<string>(loadSavedEndpoint);
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [nonce, setNonce] = useState(0);

  // Tracks the latest check so stale async results are ignored.
  const checkIdRef = useRef(0);

  useEffect(() => {
    const myId = ++checkIdRef.current;
    const controller = new AbortController();

    (async () => {
      // Yield to a microtask so these state updates are not synchronous
      // within the effect body (avoids cascading-render warnings).
      await Promise.resolve();
      if (myId !== checkIdRef.current) return;

      setStatus('checking');
      setLoadingModels(true);
      setError(null);

      const healthy = await checkHealth(baseUrl);
      if (myId !== checkIdRef.current) return; // superseded

      if (!healthy) {
        setStatus('offline');
        setLoadingModels(false);
        setError(`Cannot reach Ollama at ${baseUrl}`);
        return;
      }

      try {
        const list = await listModels(baseUrl, controller.signal);
        if (myId !== checkIdRef.current) return;
        setModels(list);
        setStatus('online');
        setLoadingModels(false);
      } catch (err) {
        if (myId !== checkIdRef.current) return;
        if ((err as Error).name === 'AbortError') return;
        setStatus('offline');
        setLoadingModels(false);
        setError((err as Error).message);
      }
    })();

    return () => controller.abort();
  }, [baseUrl, nonce]);

  const setEndpoint = useCallback((url: string): boolean => {
    const cleaned = normalizeUrl(url);
    if (!isValidUrl(cleaned)) return false;
    setBaseUrl(cleaned);
    setNonce((n) => n + 1);
    try {
      localStorage.setItem(STORAGE_KEY, cleaned);
    } catch {
      // ignore
    }
    return true;
  }, []);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  const reset = useCallback(() => {
    const def = normalizeUrl(DEFAULT_OLLAMA_URL);
    setBaseUrl(def);
    setNonce((n) => n + 1);
    try {
      localStorage.setItem(STORAGE_KEY, def);
    } catch {
      // ignore
    }
  }, []);

  return {
    baseUrl,
    status,
    models,
    error,
    loadingModels,
    setEndpoint,
    retry,
    reset,
  };
}
