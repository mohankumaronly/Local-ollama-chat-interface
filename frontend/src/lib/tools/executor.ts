// src/lib/tools/executor.ts
//
// Dispatches tool calls to fileOps functions.
// Handles:
//   - Argument extraction & type-checking
//   - Confirmation prompts for destructive ops
//   - Converting results to a token-efficient format for the model

import type { ToolResult } from '../../types';
import type { WorkspaceHandle } from '../fs/workspace';
import {
  readFile,
  writeFile,
  editFile,
  deleteFile,
  listDirectory,
  fileExists,
} from '../fs/fileOps';

/**
 * Called before a destructive tool runs. Return `true` to proceed.
 * Phase 4 wires this to a modal; Phase 3 wires it to `window.confirm`.
 */
export type ConfirmFn = (opts: {
  toolName: string;
  summary: string;
  args: Record<string, unknown>;
}) => Promise<boolean>;

export interface ExecuteOpts {
  root: WorkspaceHandle;
  workspaceName: string;
  confirm: ConfirmFn;
}

/**
 * Execute one tool call and return a ToolResult.
 * Never throws — all errors are captured in the result.
 */
export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  opts: ExecuteOpts,
): Promise<ToolResult> {
  const at = Date.now();
  const stringArg = (key: string): string => {
    const v = args[key];
    return typeof v === 'string' ? v : '';
  };

  // ─── list_directory ────────────────────────────────────────
  if (name === 'list_directory') {
    const path = stringArg('path') || '.';
    const res = await listDirectory(opts.root, opts.workspaceName, path);
    return {
      name,
      args,
      result: res,
      summary: res.ok
        ? `Listed ${res.data.length} entries in ${path === '.' ? 'workspace root' : path}`
        : `Failed to list ${path}: ${res.error}`,
      at,
    };
  }

  // ─── read_file ─────────────────────────────────────────────
  if (name === 'read_file') {
    const path = stringArg('path');
    const res = await readFile(opts.root, opts.workspaceName, path);
    return {
      name,
      args,
      result: res,
      summary: res.ok
        ? `Read ${path} (${res.data.length} chars)`
        : `Failed to read ${path}: ${res.error}`,
      at,
    };
  }

  // ─── file_exists ───────────────────────────────────────────
  if (name === 'file_exists') {
    const path = stringArg('path');
    const res = await fileExists(opts.root, opts.workspaceName, path);
    return {
      name,
      args,
      result: res,
      summary: res.ok
        ? res.data.exists
          ? `${path} exists (${res.data.size ?? 0} bytes)`
          : `${path} does not exist`
        : `Failed to check ${path}: ${res.error}`,
      at,
    };
  }

  // ─── write_file ────────────────────────────────────────────
  if (name === 'write_file') {
    const path = stringArg('path');
    const content = stringArg('content');

    const existsRes = await fileExists(opts.root, opts.workspaceName, path);
    const willOverwrite = existsRes.ok && existsRes.data.exists;

    if (willOverwrite) {
      const proceed = await opts.confirm({
        toolName: name,
        summary: `Overwrite existing file "${path}"? (${content.length} chars)`,
        args,
      });
      if (!proceed) {
        return {
          name,
          args,
          result: {
            ok: false,
            error: 'User rejected the overwrite.',
            code: 'PERMISSION_DENIED',
          },
          summary: `User cancelled overwrite of ${path}`,
          at,
        };
      }
    }

    const res = await writeFile(
      opts.root,
      opts.workspaceName,
      path,
      content,
    );
    return {
      name,
      args,
      result: res,
      summary: res.ok
        ? `${res.data.created ? 'Created' : 'Overwrote'} ${path} (${content.length} chars)`
        : `Failed to write ${path}: ${res.error}`,
      at,
    };
  }

  // ─── edit_file ─────────────────────────────────────────────
  if (name === 'edit_file') {
    const path = stringArg('path');
    const oldText = stringArg('old_text');
    const newText = stringArg('new_text');

    const proceed = await opts.confirm({
      toolName: name,
      summary: `Edit "${path}": replace ${oldText.length} chars with ${newText.length} chars?`,
      args,
    });
    if (!proceed) {
      return {
        name,
        args,
        result: {
          ok: false,
          error: 'User rejected the edit.',
          code: 'PERMISSION_DENIED',
        },
        summary: `User cancelled edit of ${path}`,
        at,
      };
    }

    const res = await editFile(
      opts.root,
      opts.workspaceName,
      path,
      oldText,
      newText,
    );
    return {
      name,
      args,
      result: res,
      summary: res.ok
        ? `Edited ${path}`
        : `Failed to edit ${path}: ${res.error}`,
      at,
    };
  }

  // ─── delete_file ───────────────────────────────────────────
  if (name === 'delete_file') {
    const path = stringArg('path');

    const proceed = await opts.confirm({
      toolName: name,
      summary: `Permanently DELETE file "${path}"? This cannot be undone.`,
      args,
    });
    if (!proceed) {
      return {
        name,
        args,
        result: {
          ok: false,
          error: 'User rejected the delete.',
          code: 'PERMISSION_DENIED',
        },
        summary: `User cancelled deletion of ${path}`,
        at,
      };
    }

    const res = await deleteFile(opts.root, opts.workspaceName, path);
    return {
      name,
      args,
      result: res,
      summary: res.ok ? `Deleted ${path}` : `Failed to delete ${path}: ${res.error}`,
      at,
    };
  }

  // ─── unknown tool ──────────────────────────────────────────
  return {
    name,
    args,
    result: {
      ok: false,
      error: `Unknown tool: ${name}`,
      code: 'UNKNOWN',
    },
    summary: `Unknown tool: ${name}`,
    at,
  };
}

/**
 * Format a tool result as a compact string to feed back to the model.
 */
export function formatToolResultForModel(result: ToolResult): string {
  if (!result.result.ok) {
    return `ERROR [${result.name}]: ${result.result.error}`;
  }

  if (result.name === 'read_file') {
    const content = result.result.data as string;
    return `FILE CONTENTS of ${result.args.path}:\n\`\`\`\n${content}\n\`\`\``;
  }

  if (result.name === 'list_directory') {
    const entries = result.result.data as Array<{
      name: string;
      kind: string;
      size?: number;
    }>;
    const lines = entries.map((e) =>
      e.kind === 'directory' ? `${e.name}/` : `${e.name} (${e.size ?? 0}b)`,
    );
    return `DIRECTORY LISTING of ${result.args.path}:\n${lines.join('\n')}`;
  }

  return result.summary;
}