// src/hooks/useFileAgent.ts

import { useCallback, useRef } from 'react';
import type {
    Message,
    MessageStats,
    ChatMode,
    ToolResult,
} from '../types';
import { streamChat, type StreamProgress } from '../lib/ollama';
import { FILE_TOOLS } from '../lib/tools/definitions';
import {
    executeToolCall,
    formatToolResultForModel,
} from '../lib/tools/executor';
import type { WorkspaceHandle } from '../lib/fs/workspace';

const MAX_ROUNDS = 8;

// ─── Fallback Parser ───────────────────────────────────────────
// Finds ALL JSON tool calls in the text, just in case the model
// outputs multiple tools at once instead of using native tool calls.
function extractToolCallsFromText(text: string) {
    const calls: Array<{ function: { name: string; arguments: Record<string, unknown> } }> = [];

    // 1. Try to match ```json ... ``` blocks
    const blockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
        try {
            const parsed = JSON.parse(match[1]);
            if (parsed.name && (parsed.arguments || parsed.parameters)) {
                calls.push({
                    function: {
                        name: parsed.name,
                        arguments: parsed.arguments || parsed.parameters,
                    }
                });
            }
        } catch {
            // ignore invalid JSON
        }
    }

    // 2. If no code blocks were found, look for raw JSON objects
    if (calls.length === 0) {
        // This regex specifically looks for the structure {"name": "...", "arguments": {...}}
        const rawRegex = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/g;

        while ((match = rawRegex.exec(text)) !== null) {
            try {
                calls.push({
                    function: {
                        name: match[1],
                        arguments: JSON.parse(match[2]),
                    }
                });
            } catch {
                // ignore
            }
        }
    }

    return calls;
}

export interface RunAgentOpts {
    baseUrl: string;
    model: string;
    mode: ChatMode;
    systemPrompt: string;
    history: Message[];
    workspace: {
        handle: WorkspaceHandle | null;
        name: string | null;
    };
    signal: AbortSignal;
    onToken: (assistantId: string, token: string) => void;
    onProgress: (p: StreamProgress | null) => void;
    onAssistantStats: (assistantId: string, stats: MessageStats) => void;
    onToolResult: (assistantId: string, result: ToolResult) => void;
    confirm: (opts: {
        toolName: string;
        summary: string;
        args: Record<string, unknown>;
    }) => Promise<boolean>;
}

export function useFileAgent() {
    const runningRef = useRef(false);

    const run = useCallback(async (opts: RunAgentOpts): Promise<void> => {
        if (runningRef.current) {
            throw new Error('Agent is already running');
        }
        runningRef.current = true;

        const {
            baseUrl,
            model,
            mode,
            systemPrompt,
            workspace,
            signal,
            onToken,
            onProgress,
            onAssistantStats,
            onToolResult,
            confirm,
        } = opts;

        let workingMessages: Array<{
            role: 'system' | 'user' | 'assistant';
            content: string;
        }> = [
                { role: 'system', content: systemPrompt },
                ...opts.history.map(({ role, content }) => ({
                    role: role as 'user' | 'assistant',
                    content,
                })),
            ];

        const tools = mode === 'build' && workspace.handle ? FILE_TOOLS : undefined;
        const assistantId = opts.history[opts.history.length - 1].id;

        try {
            for (let round = 0; round < MAX_ROUNDS; round++) {
                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

                let collectedToolCalls: Array<{
                    function: { name: string; arguments: Record<string, unknown> };
                }> = [];
                let finalStats: MessageStats | null = null;
                let fullText = '';

                await streamChat({
                    baseUrl,
                    model,
                    messages: workingMessages,
                    signal,
                    tools,
                    options: { num_ctx: 8192 },

                    // Accumulate tokens to prevent raw JSON from streaming to the UI
                    onToken: (token) => {
                        fullText += token;
                    },

                    onProgress: (p) => onProgress(p),

                    onDone: (stats) => {
                        finalStats = stats;
                    },

                    onToolCalls: (calls) => {
                        collectedToolCalls = calls as typeof collectedToolCalls;
                    },
                });

                onProgress(null);

                if (finalStats) {
                    onAssistantStats(assistantId, finalStats);
                }

                // Fallback check
                if (collectedToolCalls.length === 0 && fullText) {
                    const fallbacks = extractToolCallsFromText(fullText);
                    if (fallbacks.length > 0) {
                        // ★ ONLY keep the first tool call to prevent infinite loops
                        collectedToolCalls = [fallbacks[0]];
                        workingMessages = [
                            ...workingMessages,
                            { role: 'assistant', content: fullText },
                        ];
                    }
                }

                // Determine what text to show the user
                let textToDisplay = fullText;

                if (collectedToolCalls.length > 0) {
                    // Hide the JSON from the user.
                    // 1. Remove ```json ... ```
                    textToDisplay = textToDisplay.replace(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/g, '');
                    // 2. Remove raw `{ "name": ... }`
                    textToDisplay = textToDisplay.replace(/\{[\s\S]*?"name"[\s\S]*?\}/g, '');
                    // 3. Remove any stray curly braces
                    textToDisplay = textToDisplay.replace(/^[}\s]+/gm, '');
                    textToDisplay = textToDisplay.replace(/\s+[}]+$/gm, '');
                    // 4. Trim extra whitespace left behind
                    textToDisplay = textToDisplay.trim();

                    if (!textToDisplay) {
                        textToDisplay = "I'll do that for you.";
                    }
                }

                // Send the cleaned text to the UI
                if (textToDisplay) {
                    onToken(assistantId, textToDisplay);
                }

                if (collectedToolCalls.length === 0) {
                    break;
                }

                if (!workspace.handle || !workspace.name) {
                    onToken(
                        assistantId,
                        '\n\n_⚠️ Tool use requires an active workspace. Please select a folder first._',
                    );
                    break;
                }

                // Add spacing before tool cards
                onToken(assistantId, '\n\n');

                for (const call of collectedToolCalls) {
                    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

                    const toolName = call.function.name;
                    const toolArgs = call.function.arguments ?? {};

                    const result = await executeToolCall(toolName, toolArgs, {
                        root: workspace.handle,
                        workspaceName: workspace.name,
                        confirm,
                    });

                    onToolResult(assistantId, result);

                    const historyLength = workingMessages.length;
                    const lastMessage = workingMessages[historyLength - 1];

                    if (lastMessage.role !== 'assistant' || !lastMessage.content.includes(toolName)) {
                        workingMessages.push({
                            role: 'assistant' as const,
                            content: `[calling tool: ${toolName}]`,
                        });
                    }

                    workingMessages.push({
                        role: 'user' as const,
                        content: `TOOL RESULT [${toolName}]:\n${formatToolResultForModel(result)}`,
                    });
                }
            }
        } finally {
            runningRef.current = false;
        }
    }, []);

    return { run };
}