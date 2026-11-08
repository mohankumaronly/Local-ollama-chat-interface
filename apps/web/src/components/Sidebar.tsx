import {
  MessageSquarePlus,
  Sparkles,
  Settings,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import type { OllamaModel } from '../types';
import type { ConnectionStatus } from '../hooks/useConnection';
import type { ChatSummary } from '../lib/api';

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color =
    status === 'online'
      ? 'bg-emerald-500'
      : status === 'checking'
        ? 'bg-amber-500 animate-pulse'
        : 'bg-red-500';
  const label =
    status === 'online' ? 'Online' : status === 'checking' ? 'Checking…' : 'Offline';
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

// Group chats by relative date (Today / Yesterday / Previous 7 Days / Older)
function groupChats(chats: ChatSummary[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const sevenDaysAgo = startOfToday - 7 * 86_400_000;

  const groups: Record<string, ChatSummary[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  for (const c of chats) {
    const t = c.updatedAt ? new Date(c.updatedAt).getTime() : startOfToday;
    if (t >= startOfToday) groups.Today.push(c);
    else if (t >= startOfYesterday) groups.Yesterday.push(c);
    else if (t >= sevenDaysAgo) groups['Previous 7 Days'].push(c);
    else groups.Older.push(c);
  }

  return Object.entries(groups).filter(([, list]) => list.length > 0);
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
  chats,
  activeChatId,
  onSelectChat,
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
  chats: ChatSummary[];
  activeChatId?: number;
  onSelectChat: (id: number) => void;
}) {
  const grouped = groupChats(chats);

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 md:flex">
      {/* Header — neutral badge matching EmptyState */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <div className="grid h-8 w-8 place-items-center rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          <Sparkles size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            Beacon Flux
          </p>
          <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
            Local · private
          </p>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3">
        <button
          type="button"
          onClick={onNewChat}
          className="
            flex w-full items-center gap-2.5 rounded-lg border border-gray-200
            bg-white px-3 py-2.5 text-sm font-medium text-gray-800 shadow-sm
            transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow
            dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100
            dark:hover:border-gray-600 dark:hover:bg-gray-800/60
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-gray-900/20 dark:focus-visible:ring-gray-100/20
          "
        >
          <MessageSquarePlus size={17} />
          New chat
        </button>
      </div>

      {/* Model selector */}
      <div className="mt-4 px-3">
        <label className="mb-1.5 block px-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={models.length === 0}
          className="
            w-full rounded-lg border border-gray-200 bg-white px-3 py-2
            text-sm text-gray-800 outline-none transition-colors
            focus:border-gray-900 disabled:opacity-60
            dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100
            dark:focus:border-gray-400
          "
        >
          {models.length === 0 && <option value={model}>— no models —</option>}
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Chat history — ChatGPT style */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          {chats.length === 0 && (
            <div className="px-2 py-6 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                No chats yet.
              </p>
              <p className="mt-1 text-[11px] text-gray-400/80 dark:text-gray-500/80">
                Start a conversation to save it here.
              </p>
            </div>
          )}

          {grouped.map(([label, list]) => (
            <div key={label} className="mb-2">
              <h3 className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {label}
              </h3>
              <ul className="space-y-0.5">
                {list.map((c) => {
                  const active = c.id === activeChatId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onSelectChat(c.id)}
                        className={[
                          'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                          active
                            ? 'bg-gray-200 font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/70',
                        ].join(' ')}
                        title={c.title}
                      >
                        <MessageSquare
                          size={15}
                          className="shrink-0 opacity-60 group-hover:opacity-100"
                        />
                        <span className="truncate">{c.title || 'Untitled chat'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Connection footer */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-1.5 flex items-center justify-between">
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
              className="
                flex flex-1 items-center justify-center gap-1 rounded-md
                border border-gray-200 px-2 py-1.5 text-[11px] font-medium
                text-gray-700 transition-colors hover:bg-gray-50
                dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-gray-900/20 dark:focus-visible:ring-gray-100/20
              "
            >
              <Settings size={12} /> Change
            </button>
            <button
              type="button"
              onClick={onRetry}
              title="Re-check connection"
              className="
                grid place-items-center rounded-md border border-gray-200
                px-2 py-1.5 text-gray-700 transition-colors hover:bg-gray-50
                dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-gray-900/20 dark:focus-visible:ring-gray-100/20
              "
            >
              <RefreshCw size={12} className={loadingModels ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <p className="mt-2 px-1 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
          Chats saved to your local Postgres database.
        </p>
      </div>
    </aside>
  );
}