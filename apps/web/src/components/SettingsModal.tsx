import { useEffect, useState } from 'react';
import { X, Check, Loader2, AlertCircle, RotateCcw, Server } from 'lucide-react';
import { isValidUrl, normalizeUrl } from '../lib/ollama';
import { testOllama, setApiToken, hasApiToken } from '../lib/api';
import type { ConnectionStatus } from '../hooks/useConnection';

interface Props {
  open: boolean;
  currentUrl: string;
  status: ConnectionStatus;
  onClose: () => void;
  onSave: (url: string) => boolean;
  onReset: () => void;
}

type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; models: string[] }
  | { kind: 'fail'; message: string };

const PRESETS: Array<{ label: string; url: string; hint: string }> = [
  {
    label: 'Local machine',
    url: 'http://localhost:11434',
    hint: 'Ollama running on this computer',
  },
  {
    label: 'Local (127.0.0.1)',
    url: 'http://127.0.0.1:11434',
    hint: 'Alternative local address',
  },
  {
    label: 'Cloudflare Tunnel',
    url: 'https://your-tunnel.trycloudflare.com',
    hint: 'Expose a cloud/remote Ollama over HTTPS',
  },
];

function SettingsForm({
  currentUrl,
  status,
  onClose,
  onSave,
  onReset,
}: Omit<Props, 'open'>) {
  const [value, setValue] = useState(currentUrl);
  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaved, setTokenSaved] = useState(hasApiToken());

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = normalizeUrl(value);
  const formatOk = isValidUrl(trimmed);

  const runTest = async () => {
    if (!formatOk) {
      setTest({ kind: 'fail', message: 'Enter a valid http(s) URL first.' });
      return;
    }
    setTest({ kind: 'testing' });
    const result = await testOllama(trimmed);
    if (result.ok) {
      setTest({ kind: 'ok', models: result.models });
    } else {
      setTest({ kind: 'fail', message: result.error });
    }
  };

  const saveToken = () => {
    const t = tokenInput.trim();
    if (!t) return;
    setApiToken(t);
    setTokenSaved(true);
    setTokenInput('');
  };

  const clearToken = () => {
    setApiToken(null);
    setTokenSaved(false);
    setTokenInput('');
  };

  const save = () => {
    if (!formatOk) return;
    const ok = onSave(trimmed);
    if (ok) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-gray-500" />
            <h2
              id="settings-title"
              className="text-sm font-semibold text-gray-900 dark:text-gray-100"
            >
              Ollama Connection
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label
              htmlFor="endpoint"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Endpoint URL
            </label>
            <input
              id="endpoint"
              type="url"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setTest({ kind: 'idle' });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
              }}
              placeholder="http://localhost:11434"
              spellCheck={false}
              className={[
                'w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm outline-none dark:bg-gray-800 dark:text-gray-100',
                formatOk || value.trim() === ''
                  ? 'border-gray-300 focus:border-blue-400 dark:border-gray-600 dark:focus:border-blue-500'
                  : 'border-red-400 focus:border-red-500',
              ].join(' ')}
            />
            {!formatOk && value.trim() !== '' && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={12} /> Must start with http:// or https://
              </p>
            )}
          </div>

          {/* API Token */}
          <div>
            <label htmlFor="api-token" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              API Token
            </label>
            {tokenSaved ? (
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-500" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Token saved</span>
                <button
                  type="button"
                  onClick={clearToken}
                  className="ml-auto rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id="api-token"
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveToken(); }}
                  placeholder="Paste your API token…"
                  spellCheck={false}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={saveToken}
                  disabled={!tokenInput.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Required for all API calls. Copy from{' '}
              <code className="rounded bg-gray-100 px-1 font-mono dark:bg-gray-800">API_TOKEN=</code>{' '}
              in <code className="rounded bg-gray-100 px-1 font-mono dark:bg-gray-800">apps/server/.env</code>.
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Quick presets
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setValue(p.url);
                    setTest({ kind: 'idle' });
                  }}
                  title={p.hint}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-left text-xs text-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-gray-800"
                >
                  <span className="block font-medium">{p.label}</span>
                  <span className="block truncate font-mono text-[10px] text-gray-400">
                    {p.url}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">
              Current status:{' '}
              <span
                className={
                  status === 'online'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : status === 'checking'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                }
              >
                {status === 'online'
                  ? 'Online'
                  : status === 'checking'
                    ? 'Checking…'
                    : 'Offline'}
              </span>
            </p>
            <p className="truncate font-mono">{currentUrl}</p>
          </div>

          {test.kind !== 'idle' && (
            <div
              className={[
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                test.kind === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : test.kind === 'fail'
                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
              ].join(' ')}
            >
              {test.kind === 'testing' && <Loader2 size={14} className="animate-spin" />}
              {test.kind === 'ok' && <Check size={14} />}
              {test.kind === 'fail' && <AlertCircle size={14} />}
              {test.kind === 'testing' && 'Testing connection…'}
              {test.kind === 'ok' && ('Connected — ' + (test.models.join(', ') || '(no models)'))}
              {test.kind === 'fail' && test.message}
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <strong>Cloudflare tunnel tip:</strong> run
            <code className="mx-1 rounded bg-blue-100 px-1 font-mono dark:bg-blue-900">
              cloudflared tunnel --url http://localhost:11434
            </code>
            and paste the resulting <code className="font-mono">https://….trycloudflare.com</code>{' '}
            URL here. Make sure the remote Ollama allows your origin via
            <code className="mx-1 font-mono">OLLAMA_ORIGINS</code>.
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={test.kind === 'testing' || !formatOk}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Test
            </button>
            <button
              type="button"
              onClick={() => {
                onReset();
                onClose();
              }}
              title="Reset to the default local endpoint"
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!formatOk}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save & connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Public modal wrapper. When `open` is false nothing is rendered; when true,
 * a fresh `SettingsForm` is mounted (keyed by the current URL) so its local
 * state initializes cleanly without a reset effect.
 */
export function SettingsModal(props: Props) {
  if (!props.open) return null;
  return (
    <SettingsForm
      key={props.currentUrl}
      currentUrl={props.currentUrl}
      status={props.status}
      onClose={props.onClose}
      onSave={props.onSave}
      onReset={props.onReset}
    />
  );
}
