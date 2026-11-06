import { Bot, User } from 'lucide-react';
import type { Message } from '../types';
import { Markdown } from './Markdown';
import { MessageStatsBar } from './MessageStatsBar';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  // ─── USER: right-aligned bubble ──────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[85%] rounded-2xl bg-blue-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm whitespace-pre-wrap wrap-break-word">
          {message.content}
        </div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
          <User size={18} />
        </div>
      </div>
    );
  }

  // ─── ASSISTANT: full-width, no bubble (ChatGPT style) ────────
  return (
    <div className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
        <Bot size={18} />
      </div>
      <div className="min-w-0 flex-1 pt-1 text-sm leading-relaxed">
        <Markdown content={message.content || '…'} />
        {message.stats && <MessageStatsBar stats={message.stats} />}
      </div>
    </div>
  );
}