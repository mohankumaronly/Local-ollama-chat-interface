import type { Message } from '../types';
import type { StreamProgress } from '../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { EmptyState } from './EmptyState';
import { useAutoScroll } from '../hooks/useAutoScroll';

export function ChatWindow({
  messages,
  isStreaming,
  progress,
  onPickSuggestion,
}: {
  messages: Message[];
  isStreaming: boolean;
  progress: StreamProgress | null;
  onPickSuggestion: (text: string) => void;
}) {
  const lastContent = messages[messages.length - 1]?.content ?? '';
  const scrollRef = useAutoScroll<HTMLDivElement>(
    `${messages.length}:${lastContent.length}`,
  );

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <EmptyState onPick={onPickSuggestion} />
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {isStreaming && (
            <div className="flex items-center gap-2 pl-11 text-xs text-gray-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span>Generating…</span>
              {progress && progress.tokens > 0 && (
                <span className="flex items-center gap-2 font-mono text-[11px] text-gray-400 dark:text-gray-500">
                  <span className="text-emerald-500 dark:text-emerald-400">
                    {progress.tokensPerSecond.toFixed(1)} tok/s
                  </span>
                  <span>·</span>
                  <span>{progress.tokens} tokens</span>
                  <span>·</span>
                  <span>{(progress.elapsedMs / 1000).toFixed(1)}s</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
