import { useCallback, useEffect, useState } from 'react';
import { useConnection } from './hooks/useConnection';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { Composer } from './components/Composer';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsModal } from './components/SettingsModal';
import { FirstRunModal } from './components/FirstRunModal';
import { Settings, Check, AlertCircle } from 'lucide-react';
import {
  listChats,
  hasApiToken,
  getStoredToken,
  verifyToken,
  type ChatSummary,
} from './lib/api';

const DEFAULT_MODEL = 'llama3.2';

interface ToastState {
  message: string;
  type?: 'info' | 'success' | 'warn' | 'error';
}

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
  const [chats, setChats] = useState<ChatSummary[]>([]);
  // First-run modal: blocking on first visit if no token in localStorage
  const [firstRunOpen, setFirstRunOpen] = useState(() => !hasApiToken());
  // Amber banner: shown if firstRun modal was cancelled and token is still missing
  const [showTokenBanner, setShowTokenBanner] = useState(false);
  // Toast notifications
  const [toast, setToast] = useState<ToastState | null>(null);

  // Derive the effective model. If the current selection isn't available,
  // prefer a plain completion model (e.g. llama3.2) over "thinking" models
  // (qwen3.x) whose reasoning tokens can leave content empty for a long time.
  const fallbackModel = (() => {
    if (models.length === 0) return selectedModel;
    const preferred = models.find((m) => /^llama/i.test(m.name));
    return (preferred ?? models[0]).name;
  })();
  const model =
    models.length > 0 && !models.some((m) => m.name === selectedModel)
      ? fallbackModel
      : selectedModel;

  const handleChatCreated = useCallback((chat: { id: number; title: string }) => {
    const now = new Date().toISOString();
    setChats((prev) => [
      { id: chat.id, title: chat.title, createdAt: now, updatedAt: now },
      ...prev,
    ]);
  }, []);

  const { messages, chatId, isStreaming, progress, error, send, stop, clear, loadChat } =
    useChat({ model, ollamaUrl: baseUrl, onChatCreated: handleChatCreated });

  // Load saved chats on mount.
  useEffect(() => {
    if (hasApiToken()) {
      listChats()
        .then(setChats)
        .catch((e) => console.error('Failed to load chats', e));
    }
  }, []);

  // Background probe: if a token is stored, verify it against backend
  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      verifyToken(stored).then((res) => {
        if (!res.ok && res.reason === 'unauthorized') {
          setToast({
            message: 'API token is no longer valid — open Settings to update.',
            type: 'warn',
          });
        }
      });
    }
  }, []);

  // Toast timer auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleFirstRunSave = () => {
    setFirstRunOpen(false);
    setShowTokenBanner(false);
    setToast({
      message: "Token saved. You're ready to chat.",
      type: 'success',
    });
    listChats()
      .then(setChats)
      .catch((e) => console.error('Failed to load chats', e));
  };

  const handleFirstRunCancel = () => {
    setFirstRunOpen(false);
    setShowTokenBanner(true);
  };

  const handleSuggestion = (text: string) => {
    void send(text);
  };

  const handleSelectChat = (id: number) => {
    void loadChat(id);
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
        chats={chats}
        activeChatId={chatId}
        onSelectChat={handleSelectChat}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold">Beacon Flux Chat</h1>
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
              <span className="max-w-35 truncate font-mono">
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

        {/* No-token banner — shown when first-run modal was cancelled and token is still missing */}
        {showTokenBanner && !hasApiToken() && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100">
            <span>
              No API token configured — API calls will return 401. Paste your token in Settings.
            </span>
            <button
              type="button"
              onClick={() => { setSettingsOpen(true); setShowTokenBanner(false); }}
              className="shrink-0 rounded-lg border border-amber-600 px-3 py-1 text-xs font-medium hover:bg-amber-100 dark:border-amber-500 dark:hover:bg-amber-900/40"
            >
              Open Settings
            </button>
          </div>
        )}

        {offline && (
          <div className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <p className="mb-1 font-semibold">Cannot reach the backend</p>
            <p className="mb-2 break-all font-mono text-xs">/api/v1/health</p>
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
                Connection settings
              </button>
            </div>
            <p className="mt-2 text-xs opacity-80">
              Make sure the API server is running:{' '}
              <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900">
                npm run dev:server
              </code>
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

      {firstRunOpen && !hasApiToken() && (
        <FirstRunModal
          onSaveSuccess={handleFirstRunSave}
          onCancel={handleFirstRunCancel}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-xl transition-all ${
            toast.type === 'error' || toast.type === 'warn'
              ? 'border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
              : 'border border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
          }`}
        >
          {toast.type === 'error' || toast.type === 'warn' ? (
            <AlertCircle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <Check size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
