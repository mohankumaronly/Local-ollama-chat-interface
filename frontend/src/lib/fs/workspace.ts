// src/lib/fs/workspace.ts
//
// Wraps the File System Access API:
//   - `pickWorkspace()`   → shows folder picker
//   - `saveHandle()`      → persists handle to IndexedDB
//   - `loadHandle()`      → restores on page load
//   - `clearHandle()`     → forgets the workspace
//   - `requestPermission()` → re-prompt for permission if revoked
//
// Only works in Chromium browsers (Chrome, Edge, Brave, Opera).

import { get, set, del } from 'idb-keyval';

const HANDLE_KEY = 'ollama-chat:workspace-handle';

/**
 * We alias FileSystemDirectoryHandle to avoid clashing with the
 * global `DirectoryHandle` type that ships with lib.dom. Import
 * this type everywhere you need a workspace root.
 */
export type WorkspaceHandle = FileSystemDirectoryHandle;

/**
 * Open the browser's folder picker.
 * Returns null if the user cancelled.
 * Throws if the browser doesn't support the API.
 */
export async function pickWorkspace(): Promise<WorkspaceHandle | null> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error(
      'Your browser does not support the File System Access API. Use Chrome or Edge.',
    );
  }

  try {
    const handle = (await (
      window as unknown as {
        showDirectoryPicker: (opts?: {
          mode?: 'read' | 'readwrite';
          id?: string;
        }) => Promise<WorkspaceHandle>;
      }
    ).showDirectoryPicker({
      mode: 'readwrite',
      id: 'ollama-chat-workspace',
    })) as WorkspaceHandle;

    await saveHandle(handle);
    return handle;
  } catch (err) {
    // User cancelled — DOMException with name "AbortError"
    if ((err as DOMException).name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/** Persist the handle to IndexedDB. */
export async function saveHandle(handle: WorkspaceHandle): Promise<void> {
  await set(HANDLE_KEY, handle);
}

/** Restore the handle from IndexedDB (may need permission re-grant). */
export async function loadHandle(): Promise<WorkspaceHandle | null> {
  try {
    const stored = await get<WorkspaceHandle>(HANDLE_KEY);
    return stored ?? null;
  } catch {
    return null;
  }
}

/** Forget the saved workspace. */
export async function clearHandle(): Promise<void> {
  await del(HANDLE_KEY);
}

/**
 * Check if we currently have readwrite permission on a handle.
 * On page reload, Chrome keeps the handle but drops permission —
 * this returns 'prompt' until the user re-grants.
 */
export async function queryPermission(
  handle: WorkspaceHandle,
): Promise<'granted' | 'denied' | 'prompt'> {
  const anyHandle = handle as unknown as {
    queryPermission?: (opts: { mode: 'readwrite' }) => Promise<
      'granted' | 'denied' | 'prompt'
    >;
  };
  if (anyHandle.queryPermission) {
    return await anyHandle.queryPermission({ mode: 'readwrite' });
  }
  return 'granted'; // older API — assume granted
}

/** Ask the user to re-grant permission (must be triggered by a click). */
export async function requestPermission(
  handle: WorkspaceHandle,
): Promise<'granted' | 'denied' | 'prompt'> {
  const anyHandle = handle as unknown as {
    requestPermission?: (opts: { mode: 'readwrite' }) => Promise<
      'granted' | 'denied' | 'prompt'
    >;
  };
  if (anyHandle.requestPermission) {
    return await anyHandle.requestPermission({ mode: 'readwrite' });
  }
  return 'granted';
}

/** Feature-detect File System Access API support. */
export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}