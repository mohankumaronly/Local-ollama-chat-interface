import { useState, useCallback, useEffect } from 'react';
import type { FileEntry } from '../types';
import { listDirectory } from '../lib/fs/fileOps';
import type { WorkspaceHandle } from '../lib/fs/workspace';

export function useFileTree(
  handle: WorkspaceHandle | null,
  workspaceName: string | null,
) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!handle || !workspaceName) {
      setFiles([]);
      return;
    }
    setLoading(true);
    // We list the root directory (".") for now. Later we can make this recursive.
    const res = await listDirectory(handle, workspaceName, '.');
    if (res.ok) {
      setFiles(res.data);
    } else {
      console.error('Failed to load files:', res.error);
    }
    setLoading(false);
  }, [handle, workspaceName]);

  // Fetch on mount / when workspace changes
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { files, loading, refresh };
}