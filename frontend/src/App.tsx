import { useState } from 'react';
import { useConnection } from './hooks/useConnection';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { Composer } from './components/Composer';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsModal } from './components/SettingsModal';
import { Settings } from 'lucide-react';

const DEFAULT_MODEL = 'llama3.2';

const App = () => {
  const { theme, toggle } = useTheme();
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

  // Derive the effective model: fall back to the first available model
  // when the current selection is not present in the latest model list.
  const model =
    models.length > 0 && !models.some((m) => m.name === selectedModel)
      ? models[0].name
      : selectedModel;

  const { messages, isStreaming, progress, error, send, stop, clear } = useChat(
baseUrl,
model,
);

  const handleSuggestion = (text: string) => {
    void send(text);
  };

  const offline = status === 'offline';

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
        onOpenSettings={() => setSettingsOpen(true)}
        onRetry={retry}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold">Local Ollama Chat</h1>
            <span className="hidden truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400 sm:inline">
              {model}
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="hidden items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 sm:flex"
              title="Change Ollama endpoint"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  status === 'online'
                    ? 'bg-emerald-500'
                    : status === 'checking'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
              />
              <span className="max-w-[140px] truncate font-mono">
                {baseUrl.replace(/^https?:\/\//, '')}
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
              onClick={() => setSettingsOpen(true)}
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
            {connError && <p className="mb-2 text-xs opacity-80">{connError}</p>}
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
                onClick={() => setSettingsOpen(true)}
                className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
              >
                Change endpoint
              </button>
            </div>
            <p className="mt-2 text-xs opacity-80">
              Local: start with{' '}
              <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900">
                OLLAMA_ORIGINS="http://localhost:5173" ollama serve
              </code>
              . Remote/tunnel: ensure the endpoint is up and allows your origin.
            </p>
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
        <Composer onSend={send} onStop={stop} isStreaming={isStreaming} />
      </main>

      <SettingsModal
        open={settingsOpen}
        currentUrl={baseUrl}
        status={status}
        onClose={() => setSettingsOpen(false)}
        onSave={(url) => setEndpoint(url)}
        onReset={reset}
      />
    </div>
  );
};

export default App;
