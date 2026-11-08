import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';

export function Composer({
  onSend,
  onStop,
  isStreaming,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to a max height (ChatGPT does this)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || isStreaming) return;
    onSend(value);
    setValue('');
    // Reset height after clearing
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
      <div className="relative rounded-[28px] border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-colors focus-within:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] dark:focus-within:border-gray-600">
        <div className="flex items-end gap-2 px-3 py-2.5">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Message Ollama…"
            className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-6 text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-900 text-white transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
        Ollama can make mistakes. Verify important info. · Enter to send, Shift+Enter for newline
      </p>
    </div>
  );
}