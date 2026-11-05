import { Bot, User } from 'lucide-react';
import type { Message } from '../types';
import { Markdown } from './Markdown';
import { MessageStatsBar } from './MessageStatsBar';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
          <Bot size={18} />
        </div>
      )}

      <div
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
        ].join(' ')}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <>
            <Markdown content={message.content || '…'} />
            {message.stats && <MessageStatsBar stats={message.stats} />}
          </>
        )}
      </div>

      {isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
          <User size={18} />
        </div>
      )}
    </div>
  );
}
