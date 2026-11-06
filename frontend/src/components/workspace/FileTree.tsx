import { Folder, FileCode2, FileText, FileJson, File } from 'lucide-react';
import type { FileEntry } from '../../types';

function getFileIcon(name: string) {
  if (name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.jsx'))
    return <FileCode2 size={16} className="text-blue-500" />;
  if (name.endsWith('.html')) return <FileCode2 size={16} className="text-orange-500" />;
  if (name.endsWith('.css')) return <FileCode2 size={16} className="text-purple-500" />;
  if (name.endsWith('.json')) return <FileJson size={16} className="text-yellow-500" />;
  if (name.endsWith('.md')) return <FileText size={16} className="text-gray-500" />;
  return <File size={16} className="text-gray-400" />;
}

export function FileTree({ files }: { files: FileEntry[] }) {
  if (files.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-xs text-gray-500">
        No files found. Ask the AI to create one!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 px-2 py-2">
      {files.map((file) => (
        <div
          key={file.path}
          className="flex cursor-default items-center gap-2 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {file.kind === 'directory' ? (
            <Folder size={16} className="text-blue-400" />
          ) : (
            getFileIcon(file.name)
          )}
          <span className="truncate">{file.name}</span>
        </div>
      ))}
    </div>
  );
}