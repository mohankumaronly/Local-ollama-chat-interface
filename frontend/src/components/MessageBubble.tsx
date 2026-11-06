import { useMemo } from 'react';
import { Bot, User } from 'lucide-react';
import type { Message } from '../types';
import { Markdown } from './Markdown';
import { MessageStatsBar } from './MessageStatsBar';
import { ToolCallCard } from './ToolCallCard';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  // Clean the content before rendering
  const displayContent = useMemo(() => {
    let content = message.content || (message.toolResults ? '' : '…');

    // If there are tool results, aggressively hide code blocks in this message
    if (message.toolResults && message.toolResults.length > 0) {
      // Find any tool that accessed a file
      const fileTools = message.toolResults.filter(
        (r) => (r.name === 'write_file' || r.name === 'edit_file' || r.name === 'read_file') && r.result.ok
      );

      if (fileTools.length > 0) {
        // Strip all code blocks from the remaining text to keep the UI clean
        content = content.replace(/```[\s\S]*?```/g, '_Code updated in file._');
      }
    }

    return content;
  }, [message.content, message.toolResults]);

  // ─── USER: right-aligned bubble ──────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div
          className="
            max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed shadow-sm
            whitespace-pre-wrap break-words
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
    <div className="flex gap-3">
      <div
        className="
          grid h-8 w-8 shrink-0 place-items-center rounded-full
          border border-gray-200 bg-white text-gray-700
          dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200
        "
      >
        <Bot size={18} />
      </div>

      <div className="min-w-0 flex-1 pt-1 text-base leading-relaxed">
        <Markdown content={displayContent} />
        
        {/* Render Tool Cards */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="my-2">
            {message.toolResults.map((result, idx) => (
              <ToolCallCard key={`${result.at}-${idx}`} result={result} />
            ))}
          </div>
        )}

        {message.stats && <MessageStatsBar stats={message.stats} />}
      </div>
    </div>
  );
}