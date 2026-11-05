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
  const language = className?.replace(/language-/, '') ?? 'text';

  const copy = async () => {
    try {
      const text = String(children).replace(/\n$/, '');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <span className="font-mono">{language}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:text-gray-900 dark:hover:text-gray-100"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto bg-gray-50 p-4 text-sm dark:bg-gray-950">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
