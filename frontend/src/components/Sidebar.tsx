import { MessageSquarePlus, Sparkles, Settings, RefreshCw } from 'lucide-react';
import type { OllamaModel } from '../types';
import type { ConnectionStatus } from '../hooks/useConnection';

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color =
    status === 'online'
      ? 'bg-emerald-500'
      : status === 'checking'
        ? 'bg-amber-500 animate-pulse'
        : 'bg-red-500';
  const label =
    status === 'online'
      ? 'Online'
      : status === 'checking'
        ? 'Checking…'
        : 'Offline';
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

export function Sidebar({
  models,
  model,
  onModelChange,
  onNewChat,
  baseUrl,
  status,
  loadingModels,
  onOpenSettings,
  onRetry,
}: {
  models: OllamaModel[];
  model: string;
  onModelChange: (name: string) => void;
  onNewChat: () => void;
  baseUrl: string;
  status: ConnectionStatus;
  loadingModels: boolean;
  onOpenSettings: () => void;
  onRetry: () => void;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900 md:flex">
      <div className="mb-4 flex items-center gap-2 px-2 py-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
          <Sparkles size={18} />
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Ollama Chat
        </span>
      </div>

      <button
        type="button"
        onClick={onNewChat}
        className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <MessageSquarePlus size={16} />
        New chat
      </button>

      <label className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Model
      </label>
      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={models.length === 0}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500"
      >
        {models.length === 0 && <option value={model}>— no models —</option>}
        {models.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Connection
          </span>
          <StatusDot status={status} />
        </div>
        <p
          className="truncate font-mono text-[11px] text-gray-600 dark:text-gray-300"
          title={baseUrl}
        >
          {baseUrl.replace(/^https?:\/\//, '')}
        </p>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Settings size={12} /> Change
          </button>
          <button
            type="button"
            onClick={onRetry}
            title="Re-check connection"
            className="grid place-items-center rounded-md border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw size={12} className={loadingModels ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="mt-auto px-1 pt-4 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
        No database. Conversations live only in memory and disappear on reload.
      </div>
    </aside>
  );
}
