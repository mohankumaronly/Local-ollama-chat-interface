// src/lib/fs/pathSafety.ts
//
// Centralized safety rules for all file operations.
// EVERY read/write/delete MUST pass through `validatePath()` first.
//
// Rules enforced here:
//   1. Reject absolute paths (no "C:\..." or "/etc/...").
//   2. Reject any path containing ".." segments.
//   3. Reject paths that resolve outside the workspace root.
//   4. Reject sensitive files (.env, .git internals, private keys, ...).
//   5. Reject OS-junk (thumbs.db, .DS_Store).
//   6. Reject empty or whitespace-only paths.

import type { FileOpError } from '../../types';

// ─── Sensitive path patterns ────────────────────────────────────
// Anything matching these is *never* readable or writable.
// Keep this list conservative — false positives are annoying,
// false negatives are dangerous.

const SENSITIVE_FILE_PATTERNS: RegExp[] = [
  // Secrets / env
  /(^|\/)\.env(\.|$)/i,          // .env, .env.local, .env.production
  /(^|\/)\.env$/i,
  /(^|\/)secrets?\.(json|ya?ml|toml)$/i,
  /(^|\/)credentials?\.(json|ya?ml|toml)$/i,

  // Keys / certs
  /\.(pem|key|p12|pfx|keystore|jks)$/i,
  /(^|\/)id_(rsa|ed25519|ecdsa)(\.pub)?$/i,
  /(^|\/)\.ssh\//i,
  /(^|\/)\.gnupg\//i,

  // Cloud / CI credentials
  /(^|\/)\.aws\//i,
  /(^|\/)\.azure\//i,
  /(^|\/)\.kube\//i,
  /(^|\/)\.docker\/config\.json$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.pypirc$/i,
  /(^|\/)\.netrc$/i,
];

// ─── Directory segments blocked entirely ────────────────────────
// If any segment of the path matches, reject.
// Prevents the AI from reading `.git/objects/...` or `node_modules`.

const BLOCKED_DIR_SEGMENTS = new Set([
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  '__pycache__',
  '.venv',
  'venv',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.cache',
  '.parcel-cache',
  'target',          // rust
  'coverage',
  '.turbo',
]);

// ─── OS junk files that should be silently ignored ─────────────
const IGNORED_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  '.gitkeep',
]);

// ─── Public API ─────────────────────────────────────────────────

/**
 * Validate a user/model-supplied path against all safety rules.
 *
 * @param rawPath     The path the model or user supplied.
 * @param workspaceRoot  Display name of the workspace root (for error messages).
 * @returns           `{ ok: true, normalized }` or `{ ok: false, ...error }`.
 *
 * Note: "outside workspace" is enforced by the caller because the
 * browser's FileSystemDirectoryHandle API already scopes us to the
 * picked directory. This function only checks *logical* path safety.
 */
export function validatePath(
  rawPath: string,
  workspaceRoot: string | null,
): { ok: true; normalized: string } | FileOpError {
  // 0. Must have a workspace
  if (!workspaceRoot) {
    return {
      ok: false,
      error: 'No workspace selected. Choose a folder first.',
      code: 'NO_WORKSPACE',
    };
  }

  // 1. Trim + basic sanity
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return { ok: false, error: 'Path is empty.', code: 'INVALID_PATH' };
  }

  // 2. Reject null bytes (path injection classic)
  if (trimmed.includes('\0')) {
    return {
      ok: false,
      error: 'Path contains a null byte.',
      code: 'INVALID_PATH',
    };
  }

  // 3. Reject absolute paths — Windows and POSIX
  if (/^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    return {
      ok: false,
      error: `Absolute paths are not allowed: ${trimmed}`,
      code: 'PATH_OUTSIDE_WORKSPACE',
    };
  }

  // 4. Reject UNC paths (\\server\share)
  if (trimmed.startsWith('\\\\')) {
    return {
      ok: false,
      error: 'UNC paths are not allowed.',
      code: 'PATH_OUTSIDE_WORKSPACE',
    };
  }

  // 5. Normalize separators: all backslashes → forward slashes
  const forward = trimmed.replace(/\\/g, '/');

  // 6. Split into segments and reject ".." / "." at the path level
  const segments = forward.split('/').filter((s) => s.length > 0);

  if (segments.length === 0) {
    return { ok: false, error: 'Path resolves to workspace root.', code: 'INVALID_PATH' };
  }

  for (const seg of segments) {
    if (seg === '..') {
      return {
        ok: false,
        error: `Path traversal ("..") is not allowed: ${trimmed}`,
        code: 'PATH_OUTSIDE_WORKSPACE',
      };
    }
  }

  // 7. Reject blocked directory segments (unless it's the *file* itself)
  //    e.g. "node_modules/foo.js" → blocked because "node_modules" is a segment.
  //    e.g. "src/node_modules.ts" → allowed because the segment is "node_modules.ts".
  for (let i = 0; i < segments.length - 1; i++) {
    if (BLOCKED_DIR_SEGMENTS.has(segments[i])) {
      return {
        ok: false,
        error: `Directory "${segments[i]}" is blocked for safety.`,
        code: 'SENSITIVE_FILE',
      };
    }
  }

  // 8. Reject OS junk by exact filename
  const lastSegment = segments[segments.length - 1];
  if (IGNORED_FILES.has(lastSegment)) {
    return {
      ok: false,
      error: `File "${lastSegment}" is ignored (OS metadata).`,
      code: 'SENSITIVE_FILE',
    };
  }

  // 9. Reject sensitive file patterns (matches the full forward path)
  for (const re of SENSITIVE_FILE_PATTERNS) {
    if (re.test(forward)) {
      return {
        ok: false,
        error: `This file is protected and cannot be accessed: ${forward}`,
        code: 'SENSITIVE_FILE',
      };
    }
  }

  // 10. Return normalized forward-slash path
  return { ok: true, normalized: segments.join('/') };
}

/**
 * Quick check used by file listing to skip sensitive entries.
 * Returns `true` if a directory/file at `relPath` should be hidden from listings.
 */
export function shouldHideInListing(relPath: string): boolean {
  const segments = relPath.split('/');
  const last = segments[segments.length - 1];

  if (IGNORED_FILES.has(last)) return true;
  for (let i = 0; i < segments.length - 1; i++) {
    if (BLOCKED_DIR_SEGMENTS.has(segments[i])) return true;
  }
  const forward = segments.join('/');
  return SENSITIVE_FILE_PATTERNS.some((re) => re.test(forward));
}