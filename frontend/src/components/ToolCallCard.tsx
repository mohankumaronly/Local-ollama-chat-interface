import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, FileCode2 } from 'lucide-react';
import type { ToolResult } from '../types';

export function ToolCallCard({ result }: { result: ToolResult }) {
  const [isOpen, setIsOpen] = useState(false);
  const isSuccess = result.result.ok;

  // Clean up the tool name for display (e.g. "write_file" -> "Write File")
  const displayName = result.name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {isSuccess ? (
          <CheckCircle2 size={16} className="text-emerald-500" />
        ) : (
          <XCircle size={16} className="text-red-500" />
        )}
        <FileCode2 size={16} className="text-blue-500" />
        <span className="font-medium">{displayName}</span>
        <span className="truncate text-gray-500 dark:text-gray-400">
          {result.summary}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-2">
            <span className="font-semibold text-gray-500 dark:text-gray-400">Arguments:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-gray-100 p-2 dark:bg-gray-900">
              {JSON.stringify(result.args, null, 2)}
            </pre>
          </div>
          
          {!isSuccess && (
             <div className="mt-2 text-red-600 dark:text-red-400">
               <span className="font-semibold">Error:</span> {result.result.error}
             </div>
          )}
        </div>
      )}
    </div>
  );
}