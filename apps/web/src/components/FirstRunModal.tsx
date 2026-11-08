import { useState } from 'react';
import {
  KeyRound,
  Loader2,
  AlertCircle,
  Clipboard,
  Eye,
  EyeOff,
} from 'lucide-react';
import { verifyToken, setStoredToken } from '../lib/api';

interface Props {
  onSaveSuccess: (token: string) => void;
  onCancel: () => void;
}

export function FirstRunModal({ onSaveSuccess, onCancel }: Props) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'unauthorized' | 'network' | 'server'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setErrorMsg('Clipboard access not supported — paste manually.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        setTokenInput(text.trim());
        setErrorMsg(null);
        setStatus('idle');
      }
    } catch {
      setErrorMsg('Clipboard access denied — paste manually.');
    }
  };

  const handleTestAndSave = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setErrorMsg('Please enter an API token.');
      return;
    }

    setStatus('testing');
    setErrorMsg(null);

    const result = await verifyToken(trimmed);

    if (result.ok) {
      setStoredToken(trimmed);
      onSaveSuccess(trimmed);
      return;
    }

    if (result.reason === 'unauthorized') {
      setStatus('unauthorized');
      setErrorMsg(
        "That token doesn't match the server. Check `docker compose logs server | Select-String 'API Token'`.",
      );
      return;
    }

    if (result.reason === 'network') {
      setStatus('network');
      setErrorMsg("Can't reach server. Is the stack running?");
      return;
    }

    setStatus('server');
    setErrorMsg('Server error during verification. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Welcome — configure your API token
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paste the API token printed in your terminal when you ran docker compose up.
            </p>
          </div>
        </div>

        {/* Monospace instructions command box */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          <p className="mb-1 text-[11px] font-sans font-medium text-gray-500 dark:text-gray-400">
            Find your token by running this in your terminal:
          </p>
          <code className="block select-all rounded bg-white px-2 py-1.5 border border-gray-200 dark:border-gray-800 dark:bg-gray-900">
            docker compose logs server | Select-String "API Token"
          </code>
        </div>

        {/* Input area */}
        <div className="mb-4">
          <label
            htmlFor="first-run-api-token"
            className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            API Token
          </label>
          <div className="relative">
            <input
              id="first-run-api-token"
              type={showToken ? 'text' : 'password'}
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                setStatus('idle');
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleTestAndSave();
              }}
              placeholder="Paste your 43-character API token…"
              spellCheck={false}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-20 font-mono text-sm outline-none transition-colors focus:border-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-400"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="grid h-7 w-7 place-items-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title={showToken ? 'Hide token' : 'Show token'}
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="grid h-7 w-7 place-items-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title="Paste from clipboard"
                aria-label="Paste from clipboard"
              >
                <Clipboard size={15} />
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/70 dark:text-red-200">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Paste from clipboard
            </button>
            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={status === 'testing' || !tokenInput.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {status === 'testing' ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Testing…
                </>
              ) : (
                'Test & Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
