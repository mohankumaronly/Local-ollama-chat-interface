import { useCallback, useRef, useState } from 'react';
import type { Message, MessageStats } from '../types';
import { streamChat, type StreamProgress } from '../lib/ollama';

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export interface UseChatResult {
  messages: Message[];
  isStreaming: boolean;
  /** Live progress for the response currently being generated. */
  progress: StreamProgress | null;
  error: string | null;
  send: (text: string) => Promise<void>;
  stop: () => void;
  clear: () => void;
}

export function useChat(
  baseUrl: string,
  model: string,
  systemPrompt?: string,
): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (abortRef.current) return; // already streaming

      setError(null);
      setProgress(null);

      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };

      const assistantId = uid();
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };

      const history = [...messages, userMsg];
      setMessages([...history, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const apiMessages = [
        ...(systemPrompt
          ? [{ role: 'system' as const, content: systemPrompt }]
          : []),
        ...history.map(({ role, content }) => ({ role, content })),
      ];

      try {
        await streamChat({
          baseUrl,
          model,
          messages: apiMessages,
          signal: controller.signal,
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + token } : m,
              ),
            );
          },
          onProgress: (p) => setProgress(p),
          onDone: (stats: MessageStats) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, stats } : m,
              ),
            );
          },
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // user pressed Stop — keep whatever was generated
        } else {
          setError((err as Error).message || 'Unknown error');
          // remove empty assistant placeholder if nothing streamed
          setMessages((prev) =>
            prev.filter((m) => !(m.id === assistantId && m.content === '')),
          );
        }
      } finally {
        setIsStreaming(false);
        setProgress(null);
        abortRef.current = null;
      }
    },
    [messages, baseUrl, model, systemPrompt],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setError(null);
    setProgress(null);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, progress, error, send, stop, clear };
}
