import { useState, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import type { ChatMode } from '../types';

export function Composer({
  onSend,
  onStop,
  isStreaming,
  mode,
  onModeChange,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}) {
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
    <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2">
      {/* ★ NEW — mode toggle row */}
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onModeChange('chat')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'chat'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          💬 Chat
        </button>
        <button
          type="button"
          onClick={() => onModeChange('build')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'build'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          🛠️ Build
        </button>
      </div>

      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm focus-within:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:border-blue-500">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={
            mode === 'build'
              ? 'Describe the change you want to make…'
              : 'Message the local model…'
          }
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500 text-white transition-colors hover:bg-red-600"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send message"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
        Powered by Ollama · runs entirely on your machine · Enter to send, Shift+Enter for newline
      </p>
    </div>
  );
}