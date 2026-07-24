import type { AgentHistoryContent } from './contracts';

/**
 * When Atal exposes tools for the current task, the first model step must
 * ground itself in the application instead of inventing workspace state.
 * After at least one tool result exists, Gemini returns to AUTO so it can
 * either continue with another tool or answer naturally.
 */
export function shouldRequireAgentToolCall(
  allowedTools: readonly string[],
  history: readonly AgentHistoryContent[],
): boolean {
  return allowedTools.length > 0 && history.length === 0;
}
