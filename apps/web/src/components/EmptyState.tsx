import { Sparkles, ArrowUpRight } from 'lucide-react';

const SUGGESTIONS = [
  {
    title: 'Explain a concept',
    prompt: 'Explain recursion with a simple example.',
  },
  {
    title: 'Write some code',
    prompt: 'Write a TypeScript function to debounce an event handler.',
  },
  {
    title: 'Compare technologies',
    prompt: 'Summarize the difference between REST and GraphQL.',
  },
  {
    title: 'Brainstorm ideas',
    prompt: 'Give me 5 ideas for a weekend coding project.',
  },
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      {/* Logo badge */}
      <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
        <Sparkles size={22} />
      </div>

      {/* Heading */}
      <h2 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        How can I help you today?
      </h2>
      <p className="mb-10 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        Ask anything. Your conversation stays on this device — nothing is
        stored on a server.
      </p>

      {/* Suggestion grid */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.prompt}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="
              group flex items-start gap-3 rounded-xl border border-gray-200 bg-white
              p-3.5 text-left transition-all
              hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm
              dark:border-gray-700 dark:bg-gray-900
              dark:hover:border-gray-600 dark:hover:bg-gray-800/60
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20
              dark:focus-visible:ring-gray-100/20
            "
          >
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[13px] font-medium text-gray-900 dark:text-gray-100">
                {s.title}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {s.prompt}
              </p>
            </div>
            <ArrowUpRight
              size={15}
              className="
                mt-0.5 shrink-0 text-gray-400 transition-all
                group-hover:-translate-y-0.5 group-hover:translate-x-0.5
                group-hover:text-gray-700 dark:group-hover:text-gray-200
              "
            />
          </button>
        ))}
      </div>
    </div>
  );
}