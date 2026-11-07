// ============================================================
// API Contract Types — shared by backend and frontend
// ============================================================

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatSummary = {
  id: number;
  title: string;
  createdAt: string; // ISO string, JSON-serialized
  updatedAt: string;
};

export type ChatMessage = {
  id: number;
  chatId: number;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type MessagesResponse = {
  chat: ChatSummary;
  messages: ChatMessage[];
};

// ============================================================
// SSE Stream Events — what /api/v1/chat emits
// ============================================================

export type ServerStreamEvent =
  | { type: 'chat_created'; chatId: number }
  | { type: 'token'; text: string }
  | { type: 'done'; chatId: number; assistantMessageId: number }
  | { type: 'error'; message: string };

// ============================================================
// Request Bodies
// ============================================================

export type ChatRequestBody = {
  chatId?: number;
  message: string;
  model: string;
  /** Optional Ollama base URL. When omitted the backend falls back to env.OLLAMA_URL. */
  ollamaUrl?: string;
};

// ============================================================
// Ollama Test Endpoint
// ============================================================

export type OllamaTestResponse =
  | { ok: true; models: string[] }
  | { ok: false; error: string };

// ============================================================
// Health
// ============================================================

export type HealthResponse = {
  ok: boolean;
  db: 'up' | 'down';
  error?: string;
};
