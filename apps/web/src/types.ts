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
  /** Present only on completed assistant messages. */
  stats?: MessageStats;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

/** Fields Ollama includes on the final (done: true) chunk. */
export interface OllamaChatChunk {
  model: string;
  created_at: string;
  message: { role: Role; content: string };
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
