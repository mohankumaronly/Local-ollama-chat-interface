# 🦙 Local Ollama Chat Interface

A **ChatGPT-style chat UI** built with **React + TypeScript + Tailwind CSS** that talks to a **local AI model running via [Ollama](https://ollama.com/)**.

- ✅ ChatGPT-like professional interface
- ✅ Streaming responses (token-by-token, like the real thing)
- ✅ Light **and** dark theme
- ✅ **No database** — everything lives in memory (plug & play)
- ✅ Renders all types of AI output (Markdown, code blocks, lists, tables, math)
- ✅ 100% local — your data never leaves your machine

---

## 📋 Table of Contents

1. [What You Are Building](#1-what-you-are-building)
2. [Prerequisites](#2-prerequisites)
3. [Step 1 — Install Ollama & a Model](#3-step-1--install-ollama--a-model)
4. [Step 2 — Run Ollama with CORS Enabled](#4-step-2--run-ollama-with-cors-enabled)
5. [Step 3 — Project Setup (React + TS + Tailwind)](#5-step-3--project-setup-react--ts--tailwind)
6. [Step 4 — Project Architecture](#6-step-4--project-architecture)
7. [Step 5 — Core Files, Explained](#7-step-5--core-files-explained)
8. [Step 6 — The Ollama API (Streaming)](#8-step-6--the-ollama-api-streaming)
9. [Step 7 — Theme System (Light / Dark)](#9-step-7--theme-system-light--dark)
10. [Step 8 — Rendering Rich AI Output](#10-step-8--rendering-rich-ai-output)
11. [Step 9 — Run & Test](#11-step-9--run--test)
12. [Step 10 — Build for Production](#12-step-10--build-for-production)
    - [Configurable Connection & Cloudflare Tunnel](#12a-configurable-connection--cloudflare-tunnel)
    - [Token Usage & Tokens-Per-Second](#12b-token-usage--tokens-per-second)
13. [Troubleshooting](#13-troubleshooting)
14. [FAQ](#14-faq)

---

## 1. What You Are Building

A single-page web app that looks and feels like ChatGPT, but powered by a **local** Ollama model (e.g. `llama3.2`, `qwen2.5`, `mistral`, `phi3`).

### Features

| Feature | Description |
|---|---|
| **Chat interface** | Message bubbles for user & assistant, avatar, timestamps |
| **Streaming output** | AI text appears word-by-word as it's generated |
| **Rich rendering** | Markdown → headings, lists, tables, blockquotes, inline code |
| **Code blocks** | Syntax-highlighted with a copy button |
| **Model picker** | Dropdown to switch between installed Ollama models |
| **Theme toggle** | Light / Dark mode, persisted in `localStorage` |
| **New chat** | Reset the conversation |
| **Auto-scroll** | Follows the streamed text automatically |
| **Stop generation** | Abort button while the AI is typing |
| **Error handling** | Friendly message if Ollama is not running |
| **No database** | State lives in React only — reload clears the chat |
| **Configurable endpoint** | Switch between localhost, LAN, or a Cloudflare tunnel at runtime |
| **Connection health** | Online/offline status, timeout-based test, retry, persistence |
| **Token stats** | Live tok/s while generating; per-message tokens, total & speed |

### Data flow

```
┌──────────────────┐        fetch (POST /api/chat)        ┌──────────────────┐
│  React Frontend  │ ───────────────────────────────────▶ │ Ollama (local)   │
│  (Vite dev srv)  │ ◀─────────────────────────────────── │ http://localhost │
│                  │      NDJSON stream (one JSON/line)   │     :11434       │
└──────────────────┘                                      └──────────────────┘
```

No backend needed — the browser talks directly to Ollama.

---

## 2. Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Node.js** | ≥ 18 (20+ recommended) | Build/run the React app |
| **npm** | ≥ 9 | Package manager |
| **Ollama** | latest | Runs the local AI model |
| **Git** | any | (optional) version control |

Check your setup:

```bash
node -v
npm -v
ollama --version
```

---

## 3. Step 1 — Install Ollama & a Model

### 3.1 Install Ollama

- **Windows / macOS:** download from <https://ollama.com/download>
- **Linux:**
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```

### 3.2 Pull a model

Pick one (smaller = faster, larger = smarter):

```bash
ollama pull llama3.2          # ~2 GB, great all-rounder (recommended)
# or
ollama pull qwen2.5           # strong at coding
ollama pull mistral           # fast, 7B
ollama pull phi3              # tiny, very fast
ollama pull llava             # multimodal (images)
```

### 3.3 Verify it works

```bash
ollama run llama3.2
```

Type `hello` → you should get a reply. Exit with `/bye`.

---

## 4. Step 2 — Run Ollama with CORS Enabled

> ⚠️ **This is the #1 gotcha.** By default Ollama only accepts requests from `localhost` origins that match its allow-list. Your Vite app runs on `http://localhost:5173`, so you must allow it.

### Windows (PowerShell)

```powershell
$env:OLLAMA_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
ollama serve
```

### macOS / Linux

```bash
OLLAMA_ORIGINS="http://localhost:5173,http://127.0.0.1:5173" ollama serve
```

> If Ollama is already running (tray icon / background service), **quit it first** (Windows: right-click tray → Quit; macOS: `pkill ollama`), then run the command above.

To allow **all** origins (dev only):

```bash
OLLAMA_ORIGINS="*" ollama serve
```

**Verify Ollama is reachable:**

```bash
curl http://localhost:11434/api/tags
```

You should get JSON listing your models. If not, Ollama isn't running.

---

## 5. Step 3 — Project Setup (React + TS + Tailwind)

This repo already contains the scaffolded app. If you're starting fresh:

```bash
# 1. Create the project
npm create vite@latest frontend -- --template react-ts
cd frontend

# 2. Install dependencies
npm install

# 3. Add Tailwind CSS v4 (already installed in this repo)
npm install tailwindcss @tailwindcss/vite
```

### Configure Tailwind (v4 — no `tailwind.config.js` needed)

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`src/index.css`:

```css
@import "tailwindcss";
```

### Recommended extra packages

For a ChatGPT-quality UI you'll want Markdown rendering + syntax highlighting:

```bash
npm install react-markdown remark-gfm rehype-highlight highlight.js
npm install lucide-react        # icons (sun/moon/send/stop/trash)
```

| Package | Purpose |
|---|---|
| `react-markdown` | Render AI Markdown output safely |
| `remark-gfm` | Tables, strikethrough, task lists |
| `rehype-highlight` | Code syntax highlighting |
| `highlight.js` | Highlight styles (CSS themes) |
| `lucide-react` | Clean modern icons |

---

## 6. Step 4 — Project Architecture

Recommended folder structure:

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig*.json
└── src/
    ├── main.tsx                 # React entry
    ├── index.css                # Tailwind + theme tokens
    ├── App.tsx                  # Root layout + providers
    ├── types.ts                 # Shared TS types (Message, Model…)
    ├── lib/
    │   ├── ollama.ts            # Ollama API client (streaming)
    │   └── cn.ts                # tiny className helper (optional)
    ├── hooks/
    │   ├── useChat.ts           # Chat state + streaming logic
    │   ├── useTheme.ts          # light/dark theme + persistence
    │   └── useAutoScroll.ts     # keep the view pinned to the bottom
    └── components/
        ├── Sidebar.tsx          # New chat, model picker
        ├── ChatWindow.tsx       # Scrollable message list
        ├── MessageBubble.tsx    # User / assistant message row
        ├── Markdown.tsx         # Rich renderer for AI output
        ├── CodeBlock.tsx        # Code block with copy button
        ├── Composer.tsx         # Input box + send/stop button
        ├── ThemeToggle.tsx      # Sun / Moon switch
        └── EmptyState.tsx       # Welcome screen when no messages
```

**Why this split?** Each file does one thing. `ollama.ts` knows the API, `useChat.ts` knows the conversation, components only care about pixels.

---

## 7. Step 5 — Core Files, Explained

### 7.1 `src/types.ts`

```ts
export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface OllamaModel {
  name: string;          // e.g. "llama3.2:latest"
  size: number;          // bytes
  modified_at: string;
}

export interface OllamaChatChunk {
  model: string;
  created_at: string;
  message: { role: Role; content: string };
  done: boolean;
}
```

### 7.2 `src/lib/ollama.ts` — the API client

This is the heart of the app. It streams NDJSON from Ollama using `fetch` + `ReadableStream`.

```ts
export const OLLAMA_URL = 'http://localhost:11434';

import type { Message, OllamaModel, OllamaChatChunk } from '../types';

export async function listModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_URL}/api/tags`);
  if (!res.ok) throw new Error(`Ollama /api/tags failed: ${res.status}`);
  const data = (await res.json()) as { models: OllamaModel[] };
  return data.models ?? [];
}

export interface StreamChatOptions {
  model: string;
  messages: Pick<Message, 'role' | 'content'>[];
  signal?: AbortSignal;
  onToken: (text: string) => void;
}

/** Streams a chat completion. Returns the full text when done. */
export async function streamChat({
  model,
  messages,
  signal,
  onToken,
}: StreamChatOptions): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature: 0.7 },
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(
      `Ollama /api/chat failed (${res.status}). Is Ollama running and CORS enabled?`
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Ollama streams one JSON object per line (NDJSON)
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;

      try {
        const chunk = JSON.parse(line) as OllamaChatChunk;
        const token = chunk.message?.content ?? '';
        if (token) {
          full += token;
          onToken(token);
        }
        if (chunk.done) return full;
      } catch {
        // ignore malformed partial lines
      }
    }
  }

  return full;
}
```

**Why NDJSON?** Ollama's streaming endpoint sends **newline-delimited JSON** — one object per line. You must buffer raw text and split on `\n`, because a single network chunk may contain half a line.

### 7.3 `src/hooks/useChat.ts` — conversation state

```tsx
import { useCallback, useRef, useState } from 'react';
import type { Message } from '../types';
import { streamChat } from '../lib/ollama';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function useChat(model: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);

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

      try {
        await streamChat({
          model,
          messages: history.map(({ role, content }) => ({ role, content })),
          signal: controller.signal,
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + token } : m
              )
            );
          },
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // user pressed Stop — keep whatever was generated
        } else {
          setError((err as Error).message);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, model, isStreaming]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, send, stop, clear };
}
```

### 7.4 `src/hooks/useTheme.ts`

```tsx
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'ollama-chat-theme';

function getInitial(): Theme {
  const saved = localStorage.getItem(KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
```

> **Tailwind v4 dark mode:** by default v4 uses the `prefers-color-scheme` media query. To toggle with a class (`dark:` utilities), add this to `src/index.css`:
>
> ```css
> @import "tailwindcss";
> @custom-variant dark (&:where(.dark, .dark *));
> ```

### 7.5 `src/components/Composer.tsx` — input + send/stop

```tsx
import { useState, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function Composer({ onSend, onStop, isStreaming }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    if (!value.trim() || isStreaming) return;
    onSend(value);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6">
      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Message the local model…"
          className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            aria-label="Stop generating"
            className="grid h-10 w-10 place-items-center rounded-xl bg-red-500 text-white hover:bg-red-600"
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send message"
            className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">
        Powered by Ollama · runs entirely on your machine
      </p>
    </div>
  );
}
```

### 7.6 `src/components/MessageBubble.tsx`

```tsx
import type { Message } from '../types';
import { Markdown } from './Markdown';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white">
          AI
        </div>
      )}
      <div
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
        ].join(' ')}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <Markdown content={message.content || '…'} />
        )}
      </div>
    </div>
  );
}
```

### 7.7 `src/components/Markdown.tsx`

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CodeBlock } from './CodeBlock';

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = /language-/.test(className ?? '');
            if (!isBlock) {
              return (
                <code className="rounded bg-gray-200 px-1 py-0.5 text-[0.85em] dark:bg-gray-700" {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-400">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

### 7.8 `src/components/CodeBlock.tsx`

```tsx
import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

export function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') ?? 'text';

  const copy = async () => {
    try {
      const text = String(children).replace(/\n$/, '');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <span>{language}</span>
        <button onClick={copy} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
```

### 7.9 `src/App.tsx` — wiring it all together

```tsx
import { useEffect, useState } from 'react';
import { listModels } from './lib/ollama';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { Composer } from './components/Composer';
import { ThemeToggle } from './components/ThemeToggle';
import type { OllamaModel } from './types';

export default function App() {
  const { theme, toggle } = useTheme();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [model, setModel] = useState('llama3.2');
  const [ollamaDown, setOllamaDown] = useState(false);

  useEffect(() => {
    listModels()
      .then((list) => {
        setModels(list);
        if (list.length && !list.some((m) => m.name === model)) {
          setModel(list[0].name);
        }
        setOllamaDown(false);
      })
      .catch(() => setOllamaDown(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { messages, isStreaming, error, send, stop, clear } = useChat(model);

  return (
    <div className="flex h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Sidebar
        models={models}
        model={model}
        onModelChange={setModel}
        onNewChat={clear}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
          <h1 className="text-sm font-semibold">Local Ollama Chat</h1>
          <ThemeToggle theme={theme} onToggle={toggle} />
        </header>

        {ollamaDown && (
          <div className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <strong>Ollama is not reachable.</strong> Start it with:
            <code className="ml-1 rounded bg-amber-100 px-1 dark:bg-amber-900">
              OLLAMA_ORIGINS="http://localhost:5173" ollama serve
            </code>
          </div>
        )}

        {error && (
          <div className="m-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <ChatWindow messages={messages} isStreaming={isStreaming} />
        <Composer onSend={send} onStop={stop} isStreaming={isStreaming} />
      </main>
    </div>
  );
}
```

---

## 8. Step 6 — The Ollama API (Streaming)

### Endpoints used

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/tags` | List installed models |
| `POST` | `/api/chat` | Chat completion (streaming) |
| `POST` | `/api/generate` | Single-prompt completion (alternative) |
| `DELETE` | `/api/delete` | Delete a model (optional) |
| `GET` | `/api/ps` | Currently running models (optional) |

### `/api/chat` request body

```json
{
  "model": "llama3.2",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Explain recursion in one paragraph." }
  ],
  "stream": true,
  "options": {
    "temperature": 0.7,
    "num_ctx": 4096
  }
}
```

### Streaming response (NDJSON)

```
{"model":"llama3.2","message":{"role":"assistant","content":"Recursion"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":" is"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":" when"},"done":false}
...
{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true,"total_duration":1234567}
```

### Non-streaming (simpler, no typing effect)

Set `"stream": false` — you get a single JSON object back with `message.content` filled. Use this only if you don't care about streaming.

### Useful `options`

| Option | Default | Meaning |
|---|---|---|
| `temperature` | 0.8 | Creativity (0 = deterministic) |
| `num_ctx` | 2048 | Context window size (tokens) |
| `top_p` | 0.9 | Nucleus sampling |
| `num_predict` | -1 | Max tokens to generate (-1 = unlimited) |

---

## 9. Step 7 — Theme System (Light / Dark)

### How it works

1. `useTheme` toggles a `dark` class on `<html>`.
2. Tailwind's `dark:` variant reacts to that class (via `@custom-variant`).
3. Choice is persisted in `localStorage` and defaults to the OS preference.

### `src/index.css` — full setup

```css
@import "tailwindcss";

/* Enable class-based dark mode (Tailwind v4) */
@custom-variant dark (&:where(.dark, .dark *));

/* Smooth theme transitions */
html {
  color-scheme: light dark;
}

/* Optional: theme-aware scrollbar */
* {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.dark * {
  scrollbar-color: #475569 transparent;
}

/* Basic prose tweaks for AI markdown output */
.prose pre {
  margin: 0;
  padding: 0;
  background: transparent;
}
.prose :where(code):not(:where(pre code))::before,
.prose :where(code):not(:where(pre code))::after {
  content: "";
}
```

### `src/components/ThemeToggle.tsx`

```tsx
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: 'light' | 'dark';
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
```

### Using it in components

Just add `dark:` variants next to your normal classes:

```html
<div class="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
```

---

## 10. Step 8 — Rendering Rich AI Output

Local models generate **Markdown**. `react-markdown` + `remark-gfm` + `rehype-highlight` handles:

| Output type | Rendered by |
|---|---|
| Headings, bold, lists, quotes | `react-markdown` |
| Tables, task lists, strikethrough | `remark-gfm` |
| Fenced code blocks | `CodeBlock` + `rehype-highlight` |
| Inline code | Custom `code` component |
| Links | Custom `a` component |

### Add a syntax theme

`rehype-highlight` emits `hljs-*` classes. Add a stylesheet in `src/main.tsx`:

```ts
import 'highlight.js/styles/github-dark.css'; // or github.css, atom-one-dark.css…
```

Swap the file for the light/dark variant that matches your theme, or conditionally load both.

---

## 11. Step 9 — Run & Test

### Terminal 1 — Ollama

```bash
# Windows PowerShell
$env:OLLAMA_ORIGINS="http://localhost:5173"
ollama serve

# macOS / Linux
OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install      # first time only
npm run dev
```

Open **http://localhost:5173**.

### Manual test checklist

- [ ] Sidebar shows your installed models.
- [ ] Type "Hello" → AI responds, streaming token-by-token.
- [ ] Click **Stop** mid-response → generation halts, partial text stays.
- [ ] Ask for code → code block renders with **Copy** button.
- [ ] Ask for a table/list → renders correctly.
- [ ] Toggle theme → everything switches instantly, reload keeps the choice.
- [ ] Click **New chat** → conversation clears.
- [ ] Stop Ollama → app shows the amber "not reachable" banner.

---

## 12. Step 10 — Build for Production

```bash
cd frontend
npm run build       # outputs to frontend/dist
npm run preview     # serve locally to verify
```

Deploy `frontend/dist/` to any static host (Netlify, Vercel, GitHub Pages, a Raspberry Pi, `nginx`…).

There are two ways to point the app at an Ollama endpoint:

1. **At runtime (recommended)** — use the in-app **Connection settings** (see section 12a). You can switch endpoints without rebuilding, and the choice is saved in `localStorage`.
2. **At build time** — set a default via env var:

   ```ts
   // lib/ollama.ts
   export const DEFAULT_OLLAMA_URL =
     (import.meta.env.VITE_OLLAMA_URL as string | undefined) ??
     'http://localhost:11434';
   ```

   `.env`:

   ```
   VITE_OLLAMA_URL=https://your-tunnel.trycloudflare.com
   ```

   The runtime setting always overrides this default once the user picks an endpoint.

---

## 12a. Configurable Connection & Cloudflare Tunnel

The endpoint is **not hard-coded**. Users can point the app at any Ollama instance:

| Option | URL example | Use case |
|---|---|---|
| Local machine | `http://localhost:11434` | Ollama on this computer |
| Loopback | `http://127.0.0.1:11434` | Alternate local address |
| LAN / other PC | `http://192.168.1.50:11434` | Ollama on another device in your network |
| **Cloudflare Tunnel** | `https://random-words.trycloudflare.com` | Expose a cloud/remote Ollama over HTTPS |
| Any reverse proxy | `https://ollama.mydomain.com` | Self-hosted with TLS + auth |

### How it works in the UI

- **Sidebar → CONNECTION** block shows a status dot (**Online / Checking / Offline**), the active host, a **Change** button, and a **Re-check** (refresh) button.
- **Change** opens the *Ollama Connection* modal where you can:
  - type/paste any `http(s)` URL,
  - use the **quick presets**,
  - click **Test** to health-check the endpoint (with a timeout) before saving,
  - **Save & connect** (persists to `localStorage` and re-loads models),
  - **Reset** back to the default local endpoint.
- On any failure (unreachable, CORS, auth) the app shows an amber banner with **Retry** and **Change endpoint** actions.

> The endpoint is validated in the browser (`http://` or `https://` only) and normalized (trailing slashes stripped). The saved value survives page reloads.

### Exposing a cloud/remote Ollama with Cloudflare Tunnel

`cloudflared` gives you a public HTTPS URL that tunnels to a machine running Ollama — great for using a beefy GPU box or a cloud VM from your laptop.

**1. Run Ollama on the remote machine (with CORS for your frontend origin):**

```bash
# Allow the tunnel host + your dev/deployed origin
OLLAMA_ORIGINS="https://*.trycloudflare.com,http://localhost:5173,https://your-app.example.com" \
  ollama serve
```

> Use `OLLAMA_ORIGINS=*` only for quick tests. For production, list the exact origins.

**2. Start a tunnel to Ollama's port:**

```bash
# Quick (random URL, no account needed):
cloudflared tunnel --url http://localhost:11434

# Output looks like:
#   https://random-words-1234.trycloudflare.com
```

For a **stable** hostname, create a named tunnel tied to your Cloudflare domain:

```bash
cloudflared tunnel login
cloudflared tunnel create ollama
cloudflared tunnel route dns ollama ollama.mydomain.com
cloudflared tunnel run --url http://localhost:11434 ollama
```

**3. Paste the tunnel URL into the app:**

Open **Connection → Change**, paste `https://random-words-1234.trycloudflare.com`, click **Test** (should say *Connection successful*), then **Save & connect**.

### Reliability checklist for remote/tunnel endpoints

- [ ] Ollama is listening on `0.0.0.0:11434` (not just loopback) if the tunnel runs on the same box. Set `OLLAMA_HOST=0.0.0.0:11434`.
- [ ] `OLLAMA_ORIGINS` includes the **frontend origin** (e.g. `http://localhost:5173` and your deployed domain).
- [ ] The tunnel is up (`cloudflared` process running). Quick tunnels get a new URL each restart — update the app or use a named tunnel.
- [ ] Use **HTTPS** for the app when the tunnel is HTTPS (mixed-content blockers otherwise).
- [ ] Click **Re-check** in the sidebar after network changes; the status dot turns green when healthy.
- [ ] If you see `401/403`, a proxy is enforcing auth — the app reports *"Authentication required"*. Add auth at the proxy or expose without it on a trusted network.
- [ ] Streaming needs the proxy/tunnel to **not buffer** responses. Cloudflare tunnels pass NDJSON through fine; some proxies buffer — disable response buffering if the text arrives all at once.

### Security note

A public tunnel exposes your Ollama API to anyone with the URL. Options:

- Put **Cloudflare Access** (or another auth layer) in front of the tunnel and add the auth token to requests via a small proxy.
- Keep the tunnel on a private network (Tailscale, WireGuard) instead of public.
- Never expose `OLLAMA_ORIGINS=*` on an internet-facing box.

---

## 12b. Token Usage & Tokens-Per-Second

The app shows **real token metrics** pulled from Ollama's final stream chunk (`prompt_eval_count`, `eval_count`, `eval_duration`, `prompt_eval_duration`, `total_duration`).

### Live indicator (while generating)

Under the streaming response you'll see:

```
● Generating…  4.4 tok/s · 96 tokens · 21.6s
```

- **tok/s** — live generation speed (tokens received ÷ elapsed time since the first token)
- **tokens** — tokens received so far (≈ one chunk per token; refined to the exact count when done)
- **elapsed** — seconds since the first token arrived

### Final stats (after completion)

Each completed assistant message keeps a stats bar:

```
⚡ 4.5 tok/s generation   # 44 completion tokens   # 38 prompt tokens   ◷ 82 total   🕐 9.77s gen time
```

| Field | Source | Meaning |
|---|---|---|
| **tok/s generation** | `eval_count / eval_duration` | How fast the model wrote tokens |
| **completion tokens** | `eval_count` | Tokens the model generated |
| **prompt tokens** | `prompt_eval_count` | Tokens in the prompt + conversation context |
| **total** | sum | prompt + completion |
| **gen time** | `eval_duration` | Seconds spent generating (excludes prompt processing) |

> Prompt tokens grow with each turn because the **whole conversation history** is resent as context — that's expected and is how chat models maintain memory (without a database, only the in-memory history is sent).

### Where it lives in the code

- `lib/ollama.ts` → `buildStats()` converts Ollama's nanosecond durations into `MessageStats`; `onProgress` / `onDone` callbacks emit live + final data.
- `types.ts` → `MessageStats` and `Message.stats`.
- `hooks/useChat.ts` → stores `stats` on the assistant message and exposes live `progress`.
- `components/MessageStatsBar.tsx` → the per-message stats bar.
- `components/ChatWindow.tsx` → the live "Generating… tok/s · tokens · elapsed" row.

> Tokens are model-specific, not characters or words — expect ≈ 0.75 words per token for English. For a rough speed sense: local CPU models often run 2–10 tok/s; a GPU can hit 30–100+ tok/s.

---

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| `Failed to fetch` in console | Ollama not running → `ollama serve` |
| CORS error | Start Ollama with `OLLAMA_ORIGINS="http://localhost:5173"` (no trailing slash) |
| Sidebar empty | Run `ollama pull llama3.2` — no models installed |
| Response cut off | Model hit `num_ctx`; raise it in `options` |
| Very slow | Use a smaller model (`phi3`, `llama3.2:1b`) or reduce `num_ctx` |
| Port 5173 in use | `npm run dev -- --port 5174`, then update `OLLAMA_ORIGINS` |
| Dark mode not toggling | Ensure `@custom-variant dark` is in `index.css` |
| Malformed/blank stream | You forgot to buffer & split on `\n` (see `streamChat`) |
| `crypto.randomUUID is not a function` | Serve over `localhost` or HTTPS (not a LAN IP without TLS) |
| Tunnel URL worked yesterday, fails today | Quick Cloudflare tunnels get a new URL on restart — update the endpoint via **Connection → Change** |
| Remote works but response arrives all at once | A proxy is buffering; disable response buffering so NDJSON streams |
| `401`/`403` from endpoint | The tunnel/proxy enforces auth; add the token at the proxy or use Cloudflare Access |
| Remote Ollama unreachable from tunnel | Start Ollama with `OLLAMA_HOST=0.0.0.0:11434` and allow your origin in `OLLAMA_ORIGINS` |

### Diagnose the API directly

```bash
curl http://localhost:11434/api/tags

curl http://localhost:11434/api/chat -d '{
  "model":"llama3.2",
  "messages":[{"role":"user","content":"hi"}],
  "stream":false
}'
```

If the second returns JSON with a `message.content`, the backend is fine — the bug is in the frontend.

---

## 14. FAQ

**Do I need a backend?**
No. The browser talks to Ollama directly. If you want to expose it on your LAN or add auth, put a thin proxy in front.

**Is any data stored?**
No database. The conversation lives in React state and vanishes on reload. The only persistence is the theme choice in `localStorage`. To add history without a database, use IndexedDB (via `idb`).

**Can I use images (multimodal)?**
Yes — with a vision model (`llava`, `llama3.2-vision`), add an `images: [base64…]` field to the user message in `/api/chat`.

**How do I add system prompts?**
Prepend `{ role: 'system', content: '…' }` to `messages` in `useChat` (don't render it as a bubble).

**Can multiple chats be kept?**
Yes — hold an array of conversations in state, plus an active id. Swap the `messages` array per conversation. Persist with IndexedDB if needed.

**Will this run offline?**
Yes. Once Ollama is running with a pulled model, no internet is required.

---

## ✅ Quick-Start Recap

```bash
# 1. Model
ollama pull llama3.2

# 2. Serve Ollama (CORS)
OLLAMA_ORIGINS="http://localhost:5173" ollama serve

# 3. Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Build the app file-by-file following **Step 7**; the resulting interface is professional, supports light/dark themes, streams local-model output, and stores nothing outside your machine.

---

*Documentation generated for the Local Ollama Chat Interface project.*
