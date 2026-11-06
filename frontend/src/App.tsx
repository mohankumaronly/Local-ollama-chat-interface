import { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';

import { useConnection } from './hooks/useConnection';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import { useWorkspace } from './hooks/useWorkspace';

import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { Composer } from './components/Composer';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsModal } from './components/SettingsModal';
import { WorkspacePanel } from './components/workspace/WorkspacePanel'; // ★ NEW IMPORT

import type { ChatMode } from './types';

const DEFAULT_MODEL = 'llama3.2';

const STATUS_DOT_COLOR = {
  online: 'bg-emerald-500',
  checking: 'bg-amber-500',
  offline: 'bg-red-500',
} as const;

const App = () => {
  const { theme, toggle } = useTheme();
  const workspace = useWorkspace();

  const {
    baseUrl,
    status,
    models,
    error: connError,
    loadingModels,
    setEndpoint,
    retry,
    reset,
  } = useConnection();

  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('chat');
  
  // ★ NEW: A counter that increases every time a tool finishes running
  const [fileTreeTrigger, setFileTreeTrigger] = useState(0);

  const model = useMemo(() => {
    if (models.length === 0) return selectedModel;
    return models.some((m) => m.name === selectedModel)
      ? selectedModel
      : models[0].name;
  }, [models, selectedModel]);

  const { messages, isStreaming, progress, error, send, stop, clear } = useChat(
    baseUrl,
    model,
    mode,
    {
      workspace: { handle: workspace.handle, name: workspace.name },
    },
  );

  // ★ NEW: Watch the messages. If the number of tool results increases,
  // we trigger a refresh of the file tree.
  const toolResultCount = messages.reduce((acc, m) => acc + (m.toolResults?.length ?? 0), 0);
  
  useEffect(() => {
    if (toolResultCount > 0) {
      setFileTreeTrigger((prev) => prev + 1);
    }
  }, [toolResultCount]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const handleSuggestion = useCallback(
    (text: string) => {
      void send(text);
    },
    [send],
  );

  const handleModeChange = useCallback(
    (next: ChatMode) => {
      if (next === mode) return;
      clear();
      setMode(next);
    },
    [mode, clear],
  );

  const offline = status === 'offline';
  const statusDotClass = STATUS_DOT_COLOR[status] ?? 'bg-gray-400';
  const displayEndpoint = baseUrl.replace(/^https?:\/\//, '');

  return (
    <div className="flex h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Sidebar
        models={models}
        model={model}
        onModelChange={setSelectedModel}
        onNewChat={clear}
        baseUrl={baseUrl}
        status={status}
        loadingModels={loadingModels}
        onOpenSettings={openSettings}
        onRetry={retry}
      />

      {/* ★ NEW: The File Tree Workspace Panel */}
      {mode === 'build' && workspace.handle && (
        <WorkspacePanel
          handle={workspace.handle}
          name={workspace.name}
          refreshTrigger={fileTreeTrigger}
          onClose={workspace.clear}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold">
              Local Ollama Chat
            </h1>

            {mode === 'build' && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Build mode
              </span>
            )}

            <span className="hidden truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400 sm:inline">
              {model}
            </span>

            <button
              type="button"
              onClick={openSettings}
              title="Change Ollama endpoint"
              className="hidden items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 sm:flex"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
              <span className="max-w-35 truncate font-mono">
                {displayEndpoint}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {loadingModels && (
              <span className="hidden text-xs text-gray-400 sm:inline">
                loading models…
              </span>
            )}

            <button
              type="button"
              onClick={openSettings}
              aria-label="Connection settings"
              title="Connection settings"
              className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 md:hidden"
            >
              <Settings size={18} />
            </button>

            <ThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </header>

        {offline && (
          <div className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <p className="mb-1 font-semibold">Cannot reach Ollama</p>
            <p className="mb-2 break-all font-mono text-xs">{baseUrl}</p>
            {connError && (
              <p className="mb-2 text-xs opacity-80">{connError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={retry}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
              >
                Change endpoint
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <ChatWindow
          messages={messages}
          isStreaming={isStreaming}
          progress={progress}
          onPickSuggestion={handleSuggestion}
        />

        <Composer
          onSend={send}
          onStop={stop}
          isStreaming={isStreaming}
          mode={mode}
          onModeChange={handleModeChange}
        />
      </main>

      <SettingsModal
        open={settingsOpen}
        currentUrl={baseUrl}
        status={status}
        onClose={closeSettings}
        onSave={setEndpoint}
        onReset={reset}
      />

      {/* ★ CHANGED: Only show the floating Pick Folder button if we are in Build mode AND haven't picked a folder yet */}
      {mode === 'build' && !workspace.handle && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
          {workspace.error && (
            <span className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              {workspace.error}
            </span>
          )}
          {workspace.restoring && (
            <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Restoring workspace…
            </span>
          )}
          {!workspace.ready && workspace.name && (
            <button
              onClick={workspace.regrant}
              className="rounded-lg bg-amber-600 px-3 py-2 text-xs text-white shadow-lg hover:bg-amber-700"
            >
              🔓 Reconnect {workspace.name}
            </button>
          )}
          <button
            onClick={workspace.pick}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white shadow-lg hover:bg-emerald-700"
          >
            📁 Pick folder
          </button>
        </div>
      )}
    </div>
  );
};

export default App;