import { useCallback, useEffect, useState } from 'react';
import type { WorkspaceState } from '../types';
import {
  pickWorkspace,
  loadHandle,
  saveHandle,
  clearHandle,
  requestPermission,
  queryPermission,
  isSupported,
  type WorkspaceHandle,
} from '../lib/fs/workspace';

export interface UseWorkspaceResult extends WorkspaceState {
  handle: WorkspaceHandle | null;
  pick: () => Promise<void>;
  clear: () => Promise<void>;
  regrant: () => Promise<void>;
}

export function useWorkspace(): UseWorkspaceResult {
  const [state, setState] = useState<WorkspaceState>({
    name: null,
    ready: false,
    restoring: true,
    unsupported: !isSupported(),
    error: null,
  });
  const [handle, setHandle] = useState<WorkspaceHandle | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const saved = await loadHandle();
        if (cancelled) return;

        if (!saved) {
          setState((s) => ({ ...s, restoring: false }));
          return;
        }

        const perm = await queryPermission(saved);
        if (cancelled) return;

        if (perm === 'granted') {
          setHandle(saved);
          setState({
            name: saved.name,
            ready: true,
            restoring: false,
            unsupported: false,
            error: null,
          });
        } else {
          setHandle(saved);
          setState({
            name: saved.name,
            ready: false,
            restoring: false,
            unsupported: false,
            error: 'Click "Reconnect" to restore access to this folder.',
          });
        }
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          restoring: false,
          error: (err as Error).message || 'Failed to restore workspace.',
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const pick = useCallback(async () => {
    try {
      const picked = await pickWorkspace();
      if (!picked) return;
      await saveHandle(picked);
      setHandle(picked);
      setState({
        name: picked.name,
        ready: true,
        restoring: false,
        unsupported: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        error: (err as Error).message || 'Failed to open folder.',
      }));
    }
  }, []);

  const clear = useCallback(async () => {
    await clearHandle();
    setHandle(null);
    setState({
      name: null,
      ready: false,
      restoring: false,
      unsupported: !isSupported(),
      error: null,
    });
  }, []);

  const regrant = useCallback(async () => {
    if (!handle) return;
    const perm = await requestPermission(handle);
    if (perm === 'granted') {
      setState({
        name: handle.name,
        ready: true,
        restoring: false,
        unsupported: false,
        error: null,
      });
    } else {
      setState((s) => ({
        ...s,
        error: 'Permission was denied. Pick the folder again.',
      }));
    }
  }, [handle]);

  return { ...state, handle, pick, clear, regrant };
}