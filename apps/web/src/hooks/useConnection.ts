import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_OLLAMA_URL,
  isValidUrl,
  listModels,
  normalizeUrl,
} from '../lib/ollama';
import { checkBackendHealth } from '../lib/api';
import type { OllamaModel } from '../types';

const STORAGE_KEY = 'ollama-chat-endpoint';

export type ConnectionStatus = 'checking' | 'online' | 'offline';

export interface ConnectionState {
  /** Active Ollama base URL (normalized) — used for the model picker. */
  baseUrl: string;
  /** Backend reachability (probes /api/v1/health). Drives the online dot. */
  status: ConnectionStatus;
  models: OllamaModel[];
  error: string | null;
  loadingModels: boolean;
  setEndpoint: (url: string) => boolean;
  retry: () => void;
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

  const checkIdRef = useRef(0);

  useEffect(() => {
    const myId = ++checkIdRef.current;
    const controller = new AbortController();

    (async () => {
      await Promise.resolve();
      if (myId !== checkIdRef.current) return;

      setStatus('checking');
      setLoadingModels(true);
      setError(null);

      // 1) Backend must be up — this is what chat actually depends on.
      const backendOk = await checkBackendHealth();
      if (myId !== checkIdRef.current) return;

      if (!backendOk) {
        setStatus('offline');
        setLoadingModels(false);
        setError('Cannot reach the backend at /api/v1/health (is the server running?)');
        return;
      }

      // 2) Load available models from Ollama for the picker.
      try {
        const list = await listModels(baseUrl, controller.signal);
        if (myId !== checkIdRef.current) return;
        setModels(list);
        setStatus('online');
        setLoadingModels(false);
      } catch (err) {
        if (myId !== checkIdRef.current) return;
        if ((err as Error).name === 'AbortError') return;
        // Backend is fine but Ollama models failed — still mark online so chat
        // works; surface the model-list error separately.
        setStatus('online');
        setLoadingModels(false);
        setError(`Backend OK, but could not list models at ${baseUrl}`);
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
