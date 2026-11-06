export type Role = 'user' | 'assistant' | 'system';

/**
 * Token/timing stats for one completed assistant response.
 * Derived from Ollama's final stream chunk (durations are in nanoseconds).
 */
export interface MessageStats {
  /** Tokens in the prompt / context that was evaluated. */
  promptTokens: number;
  /** Tokens the model generated. */
  completionTokens: number;
  /** prompt + completion. */
  totalTokens: number;
  /** Generation speed in tokens/second. */
  tokensPerSecond: number;
  /** Prompt processing speed in tokens/second (0 if unavailable). */
  promptTokensPerSecond: number;
  /** Total wall-clock time for the request in milliseconds. */
  totalMs: number;
  /** Time spent generating tokens in milliseconds. */
  evalMs: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  stats?: MessageStats;
  toolResults?: ToolResult[]; // ★ ADD THIS LINE
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

/** Fields Ollama includes on the final (done: true) chunk. */
/** Fields Ollama includes on the final (done: true) chunk. */
export interface OllamaChatChunk {
  model: string;
  created_at: string;
  message: {
    role: Role;
    content: string;
    /** Present when the model wants to call tools (build mode). */
    tool_calls?: ToolCall[];
  };
  done: boolean;
  done_reason?: string;
  // All durations are nanoseconds.
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

// ★ NEW — append below the existing ChatMode
export type ChatMode = 'chat' | 'build';

// ─────────────────────────────────────────────────────────────
// File-system workspace types
// ─────────────────────────────────────────────────────────────

/** A single entry in the workspace tree. */
export interface FileEntry {
  /** Path relative to the workspace root, e.g. "src/App.tsx". */
  path: string;
  /** Just the filename, e.g. "App.tsx". */
  name: string;
  /** 'file' or 'directory'. */
  kind: 'file' | 'directory';
  /** Size in bytes (files only). */
  size?: number;
  /** Last modified timestamp (files only). */
  modifiedAt?: number;
}

/** Result of a successful file operation. */
export interface FileOpResult<T = void> {
  ok: true;
  data: T;
}

/** Result of a failed file operation — never throws across the boundary. */
export interface FileOpError {
  ok: false;
  error: string;
  code:
  | 'PATH_OUTSIDE_WORKSPACE'
  | 'SENSITIVE_FILE'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'INVALID_PATH'
  | 'NO_WORKSPACE'
  | 'UNKNOWN';
}

export type FileOpResponse<T = void> = FileOpResult<T> | FileOpError;

/** State of the currently selected workspace folder. */
export interface WorkspaceState {
  /** Display name of the folder (e.g. "my-project"). */
  name: string | null;
  /** True when a folder has been picked and is accessible. */
  ready: boolean;
  /** True while we're restoring the handle from IndexedDB on page load. */
  restoring: boolean;
  /** True when the browser doesn't support File System Access API. */
  unsupported: boolean;
  /** Error message if the handle needs re-permission or failed. */
  error: string | null;
}

// ★ NEW — append below the existing workspace types

// ─────────────────────────────────────────────────────────────
// Ollama tool-calling types
// ─────────────────────────────────────────────────────────────

/** A tool call the model wants to make. */
export interface ToolCall {
  id?: string;
  function: {
    name: string;
    /** Ollama sends this as a JSON object, not a string. */
    arguments: Record<string, unknown>;
  };
}

/** Result of executing a tool call — fed back to the model. */
export interface ToolResult {
  /** Name of the tool that was called. */
  name: string;
  /** The arguments originally passed (for display). */
  args: Record<string, unknown>;
  /** The result payload — success or failure info. */
  result: FileOpResponse<unknown> | { ok: true; data: unknown };
  /** Human-readable one-liner for the UI to show. */
  summary: string;
  /** Timestamp for ordering. */
  at: number;
}

/** Extends Message with optional tool activity (Phase 3+). */
export interface AgentMessage extends Message {
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

