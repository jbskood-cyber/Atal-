import type { AgentHistoryContent } from './contracts';

export const AGENT_TOOL_CALL_REPAIR_MARKER = '[ATAL_TOOL_CALL_REPAIR]';

function hasPendingToolCallRepair(history: readonly AgentHistoryContent[]): boolean {
  const last = history.at(-1);
  if (!last || last.role !== 'user') return false;
  return last.parts.some((part) => typeof part.text === 'string' && part.text.includes(AGENT_TOOL_CALL_REPAIR_MARKER));
}

/**
 * When Atal exposes tools for the current task, the first model step must
 * ground itself in the application instead of inventing workspace state.
 * A repair turn is also forced when Gemini emitted tool-shaped JSON as plain
 * text; after a real tool result exists Gemini returns to AUTO so it can
 * either continue with another tool or answer naturally.
 */
export function shouldRequireAgentToolCall(
  allowedTools: readonly string[],
  history: readonly AgentHistoryContent[],
): boolean {
  return allowedTools.length > 0 && (history.length === 0 || hasPendingToolCallRepair(history));
}
