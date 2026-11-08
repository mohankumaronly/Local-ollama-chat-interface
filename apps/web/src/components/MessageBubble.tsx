import { useState } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import type { Message } from '../types';
import { Markdown } from './Markdown';
import { MessageStatsBar } from './MessageStatsBar';

export function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  // ─── USER: right-aligned bubble ──────────────────────────────
  if (isUser) {
    return (
      <div className="group flex justify-end gap-3">
        <div
          className="
            max-w-[85%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed
            whitespace-pre-wrap wrap-break-word
            bg-gray-100 text-gray-900
            dark:bg-gray-800 dark:text-gray-100
          "
        >
          {message.content}
        </div>
        <div
          className="
            grid h-8 w-8 shrink-0 place-items-center rounded-full
            bg-gray-200 text-gray-600
            dark:bg-gray-700 dark:text-gray-300
          "
        >
          <User size={18} />
        </div>
      </div>
    );
  }

  // ─── ASSISTANT: full-width, no bubble (ChatGPT style) ────────
  return (
    <div className="group flex gap-3">
      {/* Avatar: white/black circle with border — like ChatGPT's logo badge */}
      <div
        className="
          mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full
          border border-gray-200 bg-white text-gray-700
          dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200
        "
      >
        <Bot size={18} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed">
        <Markdown content={message.content || '…'} />
        {message.stats && <MessageStatsBar stats={message.stats} />}

        {/* Action row — copy response (hover-revealed on desktop) */}
        <div
          className="
            mt-1.5 flex items-center gap-1
            opacity-0 transition-opacity
            group-hover:opacity-100 focus-within:opacity-100
          "
        >
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? 'Copied' : 'Copy response'}
            title={copied ? 'Copied!' : 'Copy response'}
            className="
              inline-flex items-center gap-1.5 rounded-md px-1.5 py-1
              text-xs text-gray-400 transition-colors
              hover:bg-gray-100 hover:text-gray-700
              dark:hover:bg-gray-800 dark:hover:text-gray-200
            "
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}