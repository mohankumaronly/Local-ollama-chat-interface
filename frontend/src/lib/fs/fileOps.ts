// src/lib/fs/fileOps.ts
//
// Pure-ish file operations. All functions return FileOpResponse<T>
// — they never throw. Callers check `result.ok` to branch.
//
// All paths are validated by pathSafety.ts before any disk I/O.

import type { FileEntry, FileOpResponse } from '../../types';
import { validatePath, shouldHideInListing } from './pathSafety';
import type { WorkspaceHandle } from './workspace';

// ─── Internal helpers ──────────────────────────────────────────

async function resolveParent(
  root: WorkspaceHandle,
  relPath: string,
): Promise<
  | { ok: true; dir: WorkspaceHandle; name: string }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'UNKNOWN' }
> {
  const parts = relPath.split('/');
  const name = parts.pop();
  if (!name) {
    return { ok: false, error: 'Empty path', code: 'NOT_FOUND' };
  }

  let dir: WorkspaceHandle = root;
  for (const part of parts) {
    try {
      dir = await dir.getDirectoryHandle(part, { create: false });
    } catch {
      return {
        ok: false,
        error: `Directory not found: ${parts.join('/')}`,
        code: 'NOT_FOUND',
      };
    }
  }
  return { ok: true, dir, name };
}

function toError(
  error: string,
  code:
    | 'NOT_FOUND'
    | 'ALREADY_EXISTS'
    | 'PERMISSION_DENIED'
    | 'INVALID_PATH'
    | 'UNKNOWN',
): { ok: false; error: string; code: typeof code } {
  return { ok: false, error, code };
}

// ─── readFile ──────────────────────────────────────────────────

export async function readFile(
  root: WorkspaceHandle,
  workspaceName: string,
  relPath: string,
): Promise<FileOpResponse<string>> {
  const v = validatePath(relPath, workspaceName);
  if (!v.ok) return v;

  const parent = await resolveParent(root, v.normalized);
  if (!parent.ok) return parent;

  try {
    const fileHandle = await parent.dir.getFileHandle(parent.name, {
      create: false,
    });
    const file = await fileHandle.getFile();
    const text = await file.text();
    return { ok: true, data: text };
  } catch (err) {
    if ((err as DOMException).name === 'NotFoundError') {
      return toError(`File not found: ${v.normalized}`, 'NOT_FOUND');
    }
    if ((err as DOMException).name === 'NotAllowedError') {
      return toError('Permission denied.', 'PERMISSION_DENIED');
    }
    return toError((err as Error).message || 'Unknown error', 'UNKNOWN');
  }
}

// ─── writeFile ─────────────────────────────────────────────────

export async function writeFile(
  root: WorkspaceHandle,
  workspaceName: string,
  relPath: string,
  content: string,
): Promise<FileOpResponse<{ path: string; created: boolean }>> {
  const v = validatePath(relPath, workspaceName);
  if (!v.ok) return v;

  const parts = v.normalized.split('/');
  const name = parts.pop();
  if (!name) return toError('Empty path', 'INVALID_PATH');

  try {
    let dir: WorkspaceHandle = root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }

    let existed = false;
    try {
      await dir.getFileHandle(name, { create: false });
      existed = true;
    } catch {
      existed = false;
    }

    const fileHandle = await dir.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    return { ok: true, data: { path: v.normalized, created: !existed } };
  } catch (err) {
    if ((err as DOMException).name === 'NotAllowedError') {
      return toError('Permission denied for write.', 'PERMISSION_DENIED');
    }
    return toError((err as Error).message || 'Unknown error', 'UNKNOWN');
  }
}

// ─── editFile ──────────────────────────────────────────────────

export async function editFile(
  root: WorkspaceHandle,
  workspaceName: string,
  relPath: string,
  oldText: string,
  newText: string,
): Promise<FileOpResponse<{ path: string; replacements: number }>> {
  const v = validatePath(relPath, workspaceName);
  if (!v.ok) return v;

  const read = await readFile(root, workspaceName, v.normalized);
  if (!read.ok) return read;

  const content = read.data;
  const occurrences = content.split(oldText).length - 1;

  if (occurrences === 0) {
    return toError(
      `Text to replace was not found in ${v.normalized}. Read the file first to confirm exact content.`,
      'NOT_FOUND',
    );
  }

  if (occurrences > 1) {
    return toError(
      `Text appears ${occurrences} times in ${v.normalized}. Include more surrounding context to make it unique.`,
      'INVALID_PATH',
    );
  }

  const next = content.replace(oldText, newText);
  const write = await writeFile(root, workspaceName, v.normalized, next);
  if (!write.ok) return write;

  return { ok: true, data: { path: v.normalized, replacements: 1 } };
}

// ─── deleteFile ────────────────────────────────────────────────

export async function deleteFile(
  root: WorkspaceHandle,
  workspaceName: string,
  relPath: string,
): Promise<FileOpResponse<{ path: string }>> {
  const v = validatePath(relPath, workspaceName);
  if (!v.ok) return v;

  const parent = await resolveParent(root, v.normalized);
  if (!parent.ok) return parent;

  try {
    await parent.dir.removeEntry(parent.name);
    return { ok: true, data: { path: v.normalized } };
  } catch (err) {
    if ((err as DOMException).name === 'NotFoundError') {
      return toError(`File not found: ${v.normalized}`, 'NOT_FOUND');
    }
    if ((err as DOMException).name === 'NotAllowedError') {
      return toError('Permission denied for delete.', 'PERMISSION_DENIED');
    }
    return toError((err as Error).message || 'Unknown error', 'UNKNOWN');
  }
}

// ─── listDirectory ─────────────────────────────────────────────

export async function listDirectory(
  root: WorkspaceHandle,
  workspaceName: string,
  relPath: string = '.',
): Promise<FileOpResponse<FileEntry[]>> {
  let dirHandle: WorkspaceHandle = root;
  let prefix = '';

  if (relPath !== '.' && relPath !== '') {
    const v = validatePath(relPath, workspaceName);
    if (!v.ok) return v;
    const parent = await resolveParent(root, v.normalized);
    if (!parent.ok) return parent;
    try {
      dirHandle = await parent.dir.getDirectoryHandle(parent.name);
      prefix = v.normalized;
    } catch {
      return toError(`Directory not found: ${v.normalized}`, 'NOT_FOUND');
    }
  }

  const entries: FileEntry[] = [];

  try {
    for await (const [name, handle] of dirHandle.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;

      if (shouldHideInListing(path)) continue;

      if (handle.kind === 'file') {
        let size: number | undefined;
        let modifiedAt: number | undefined;
        try {
          const file = await (handle as FileSystemFileHandle).getFile();
          size = file.size;
          modifiedAt = file.lastModified;
        } catch {
          /* ignore */
        }
        entries.push({ path, name, kind: 'file', size, modifiedAt });
      } else {
        entries.push({ path, name, kind: 'directory' });
      }
    }
  } catch (err) {
    return toError((err as Error).message || 'Unknown error', 'UNKNOWN');
  }

  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { ok: true, data: entries };
}

// ─── fileExists ────────────────────────────────────────────────

export async function fileExists(
  root: WorkspaceHandle,
  workspaceName: string,
  relPath: string,
): Promise<FileOpResponse<{ exists: boolean; size?: number }>> {
  const v = validatePath(relPath, workspaceName);
  if (!v.ok) return v;

  const parent = await resolveParent(root, v.normalized);
  if (!parent.ok) return parent;

  try {
    const fileHandle = await parent.dir.getFileHandle(parent.name, {
      create: false,
    });
    const file = await fileHandle.getFile();
    return { ok: true, data: { exists: true, size: file.size } };
  } catch (err) {
    if ((err as DOMException).name === 'NotFoundError') {
      return { ok: true, data: { exists: false } };
    }
    return toError((err as Error).message || 'Unknown error', 'UNKNOWN');
  }
}