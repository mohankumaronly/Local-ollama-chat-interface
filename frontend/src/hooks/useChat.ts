import { useCallback, useRef, useState } from 'react';
import type { ChatMode, Message, MessageStats, ToolResult } from '../types';
import { streamChat, type StreamProgress } from '../lib/ollama';
import { useFileAgent } from './useFileAgent';
import type { WorkspaceHandle } from '../lib/fs/workspace';

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  chat: 'You are a helpful assistant. Answer clearly and concisely. Use Markdown formatting (headings, lists, code blocks, tables) when it improves readability.',
  build:
    'You are an autonomous coding assistant.\n' +
    'CRITICAL RULES:\n' +
    '1. Do NOT list directories unless the user explicitly asks.\n' +
    '2. If the user asks you to build something new, use `write_file`.\n' +
    '3. If the user asks you to modify or add to an EXISTING file, you MUST use `read_file` first, and then use `edit_file` to make the change. Do NOT use `write_file` to rewrite the whole file.\n' +
    '4. NEVER output raw JSON blocks. Use the native tool calling interface.\n' +
    '5. Do NOT output the file contents in the chat. Just write it to the file.\n' +
    '6. Do exactly ONE tool call at a time.\n' +
    '7. ALWAYS explain what you are about to do in one short sentence before invoking a tool.\n' +
    '8. Never say "File updated" unless you actually called `edit_file`.\n', // Added this to stop hallucinations
};

export interface UseChatResult {
  messages: Message[];
  isStreaming: boolean;
  progress: StreamProgress | null;
  error: string | null;
  mode: ChatMode;
  send: (text: string) => Promise<void>;
  stop: () => void;
  clear: () => void;
}

export interface UseChatOptions {
  workspace?: {
    handle: WorkspaceHandle | null;
    name: string | null;
  };
  systemPrompt?: string;
}

export function useChat(
  baseUrl: string,
  model: string,
  mode: ChatMode = 'chat',
  opts: UseChatOptions = {},
): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const agent = useFileAgent();

  const effectiveSystemPrompt = opts.systemPrompt ?? SYSTEM_PROMPTS[mode];
  const workspace = opts.workspace ?? { handle: null, name: null };

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (abortRef.current) return;

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

      const useAgent = mode === 'build' && workspace.handle;

      try {
        if (useAgent) {
          await agent.run({
            baseUrl,
            model,
            mode,
            systemPrompt: effectiveSystemPrompt,
            history: [...history, assistantMsg],
            workspace: {
              handle: workspace.handle,
              name: workspace.name,
            },
            signal: controller.signal,
            onToken: (id, token) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id ? { ...m, content: m.content + token } : m,
                ),
              );
            },
            onProgress: (p) => setProgress(p),
            onAssistantStats: (id, stats) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, stats } : m)),
              );
            },
            onToolResult: (id, result: ToolResult) => {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== id) return m;
                  const existing = m.toolResults ?? [];
                  return { ...m, toolResults: [...existing, result] };
                }),
              );
            },
            confirm: async (o) => window.confirm(o.summary),
          });
        } else {
          const apiMessages = [
            ...(effectiveSystemPrompt
              ? [{ role: 'system' as const, content: effectiveSystemPrompt }]
              : []),
            ...history.map(({ role, content }) => ({ role, content })),
          ];

          await streamChat({
            baseUrl,
            model,
            messages: apiMessages,
            signal: controller.signal,
            onToken: (token) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + token }
                    : m,
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
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message || 'Unknown error');
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
    [
      messages,
      baseUrl,
      model,
      mode,
      effectiveSystemPrompt,
      workspace.handle,
      workspace.name,
      agent,
    ],
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

  return { messages, isStreaming, progress, error, mode, send, stop, clear };
}