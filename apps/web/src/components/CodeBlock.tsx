import { useRef, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

export function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const rawLang = className?.replace(/language-/, '') ?? '';
  const language = rawLang && rawLang !== 'text' ? rawLang : null;

  const copy = async () => {
    try {
      const text = codeRef.current?.textContent ?? '';
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-gray-700/60 bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#2f2f2f] px-4 py-1.5">
        <span className="text-xs font-medium text-gray-300">
          {language ?? 'Code'}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copied!' : 'Copy code'}</span>
        </button>
      </div>

      {/* Code body */}
      <pre className="max-w-full overflow-x-auto bg-[#0d0d0d] p-4 text-[0.875rem] leading-6 text-gray-100">
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </pre>
    </div>
  );
}