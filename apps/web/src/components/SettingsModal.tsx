import { useEffect, useState } from 'react';
import {
  X,
  Check,
  Loader2,
  AlertCircle,
  RotateCcw,
  Server,
  KeyRound,
  Link2,
  Zap,
} from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
      <Icon size={14} className="text-gray-400 dark:text-gray-500" />
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: ConnectionStatus }) {
  const styles = {
    online: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    checking: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    offline: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  }[status];
  const dot = {
    online: 'bg-emerald-500',
    checking: 'bg-amber-500 animate-pulse',
    offline: 'bg-red-500',
  }[status];
  const label = {
    online: 'Online',
    checking: 'Checking…',
    offline: 'Offline',
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function TestResult({ test }: { test: TestState }) {
  if (test.kind === 'idle') return null;

  const base =
    'mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed';
  const styles =
    test.kind === 'ok'
      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
      : test.kind === 'fail'
        ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div className={`${base} ${styles}`}>
      <span className="mt-0.5 shrink-0">
        {test.kind === 'testing' && <Loader2 size={14} className="animate-spin" />}
        {test.kind === 'ok' && <Check size={14} />}
        {test.kind === 'fail' && <AlertCircle size={14} />}
      </span>
      <span className="min-w-0 wrap-break-word">
        {test.kind === 'testing' && 'Testing connection…'}
        {test.kind === 'ok' &&
          `Connected — ${test.models.join(', ') || '(no models)'}`}
        {test.kind === 'fail' && test.message}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = normalizeUrl(value);
  const formatOk = isValidUrl(trimmed);
  const showFormatError = !formatOk && value.trim() !== '';

  const runTest = async () => {
    if (!formatOk) {
      setTest({ kind: 'fail', message: 'Enter a valid http(s) URL first.' });
      return;
    }
    setTest({ kind: 'testing' });
    const result = await testOllama(trimmed);
    if (result.ok) setTest({ kind: 'ok', models: result.models });
    else setTest({ kind: 'fail', message: result.error });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900">
              <Server size={16} />
            </div>
            <div>
              <h2
                id="settings-title"
                className="text-[15px] font-semibold text-gray-900 dark:text-gray-100"
              >
                Settings
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure your Ollama connection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-5 py-5">
          {/* Current status strip */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Current endpoint
              </p>
              <p className="truncate font-mono text-xs text-gray-700 dark:text-gray-300">
                {currentUrl}
              </p>
            </div>
            <StatusPill status={status} />
          </div>

          {/* Endpoint URL */}
          <section>
            <SectionLabel icon={Link2}>Endpoint URL</SectionLabel>
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
                'w-full rounded-lg border bg-white px-3 py-2.5 font-mono text-sm outline-none transition-colors',
                'dark:bg-gray-800 dark:text-gray-100',
                showFormatError
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-300 focus:border-gray-900 dark:border-gray-700 dark:focus:border-gray-400',
              ].join(' ')}
            />
            {showFormatError && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={12} /> Must start with http:// or https://
              </p>
            )}

            {/* Presets */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PRESETS.map((p) => {
                const selected = value === p.url;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setValue(p.url);
                      setTest({ kind: 'idle' });
                    }}
                    title={p.hint}
                    className={[
                      'rounded-lg border px-2.5 py-2 text-left text-xs transition-colors',
                      selected
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-300 dark:bg-white dark:text-gray-900'
                        : 'border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800',
                    ].join(' ')}
                  >
                    <span className="block font-medium">{p.label}</span>
                    <span
                      className={[
                        'block truncate font-mono text-[10px]',
                        selected
                          ? 'opacity-70'
                          : 'text-gray-400 dark:text-gray-500',
                      ].join(' ')}
                    >
                      {p.url}
                    </span>
                  </button>
                );
              })}
            </div>

            <TestResult test={test} />
          </section>

          {/* API Token */}
          <section>
            <SectionLabel icon={KeyRound}>API Token</SectionLabel>
            {tokenSaved ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/50">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Token saved securely on this device
                </span>
                <button
                  type="button"
                  onClick={clearToken}
                  className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveToken();
                  }}
                  placeholder="Paste your API token…"
                  spellCheck={false}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-400"
                />
                <button
                  type="button"
                  onClick={saveToken}
                  disabled={!tokenInput.trim()}
                  className="rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  Save
                </button>
              </div>
            )}
            <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Required for all API calls. Find your token in the terminal banner
              by running{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">
                docker compose logs server
              </code>
              .
            </p>
          </section>

          {/* Cloudflare hint */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-3 dark:border-blue-900 dark:bg-blue-950/40">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-200">
              <Zap size={13} /> Cloudflare Tunnel
            </div>
            <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-200/90">
              Run{' '}
              <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px] dark:bg-blue-900/60">
                cloudflared tunnel --url http://localhost:11434
              </code>{' '}
              and paste the resulting{' '}
              <code className="font-mono text-[11px]">https://….trycloudflare.com</code>{' '}
              URL above. Ensure the remote Ollama allows your origin via{' '}
              <code className="font-mono text-[11px]">OLLAMA_ORIGINS</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-50/60 px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={test.kind === 'testing' || !formatOk}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {test.kind === 'testing' ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Testing…
                </span>
              ) : (
                'Test connection'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                onReset();
                onClose();
              }}
              title="Reset to the default local endpoint"
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!formatOk}
              className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
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