import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

/** Recursively extract plain text from React nodes (fixes the [object Object] copy bug). */
function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return nodeToText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

export function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  // Clean up the class name: "hljs language-json" -> "json"
  let language = 'text';
  if (className) {
    const match = /language-(\w+)/.exec(className);
    if (match) language = match[1];
  }

  const copy = async () => {
    try {
      const text = nodeToText(children).replace(/\n$/, '');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="group my-4 overflow-hidden rounded-xl border border-gray-200 bg-[#0d1117] dark:border-gray-700">
      <div className="flex items-center justify-between border-b border-gray-200/60 bg-[#161b22] px-3 py-1.5 text-xs text-gray-400">
        {/* Only shows "json", "css", etc. */}
        <span className="font-mono">{language}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-gray-400 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-gray-100"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copied!' : 'Copy code'}</span>
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto p-4 text-[0.875rem] leading-6">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}