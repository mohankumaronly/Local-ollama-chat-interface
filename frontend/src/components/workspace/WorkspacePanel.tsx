import { FolderOpen, RefreshCw, X } from 'lucide-react';
import { useFileTree } from '../../hooks/useFileTree';
import type { WorkspaceHandle } from '../../lib/fs/workspace';
import { FileTree } from './FileTree';
import { useEffect } from 'react';

export function WorkspacePanel({
  handle,
  name,
  onClose,
  refreshTrigger,
}: {
  handle: WorkspaceHandle | null;
  name: string | null;
  onClose: () => void;
  refreshTrigger: number; // Used to force a refresh when AI writes a file
}) {
  const { files, loading, refresh } = useFileTree(handle, name);

  // Refresh the tree whenever refreshTrigger changes (e.g., after a tool runs)
  useEffect(() => {
    if (refreshTrigger > 0) void refresh();
  }, [refreshTrigger, refresh]);

  if (!name) return null;

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
        <div className="flex items-center gap-2 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
          <FolderOpen size={16} className="text-emerald-600" />
          <span className="truncate">{name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            title="Refresh files"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
            title="Close workspace"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        <FileTree files={files} />
      </div>
    </div>
  );
}