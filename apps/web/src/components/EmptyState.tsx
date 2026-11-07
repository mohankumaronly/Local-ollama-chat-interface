import { Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'Explain recursion with a simple example.',
  'Write a TypeScript function to debounce an event handler.',
  'Summarize the difference between REST and GraphQL.',
  'Give me 5 ideas for a weekend coding project.',
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white">
        <Sparkles size={26} />
      </div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
        How can I help you today?
      </h2>
      <p className="mb-8 max-w-md text-sm text-gray-500 dark:text-gray-400">
        Ask anything. Your conversation stays on this device — nothing is stored
        on a server.
      </p>

      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-gray-800"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
