import type { ConfirmationMode, ToolExecutionResult } from '../core/contracts';
import { executeLegacyAIAction, executionContext, invocationFromCommand } from '../core/legacyAdapters';
import { executeUndo } from '../core/undoEngine';
import type { AICommand, AICommandResult, AIUndoToken, AIWorkContext } from '../types';

export type AICommandClass = 'query' | 'draft' | 'delicate';

const legacyCommandClass: Record<AICommand['type'], AICommandClass> = {
  search_patient: 'query', summarize_patient: 'query', summarize_sessions: 'query', create_report: 'query',
  add_patient_note: 'draft', update_settings: 'draft', activate_plan: 'delicate', pause_plan: 'delicate',
  complete_plan: 'delicate', archive_plan: 'delicate', restore_plan: 'delicate', replace_active_plan: 'delicate',
  export_data: 'delicate',
};

// Compatibility only. Execution policy is owned by the registered core tool.
export function getAICommandClass(command: AICommand): AICommandClass {
  return legacyCommandClass[command.type];
}

function asLegacyResult(result: ToolExecutionResult): AICommandResult {
  if (result.status !== 'success') {
    const message = result.status === 'clarification'
      ? result.clarification.message
      : result.status === 'confirmation-required'
        ? result.decision.reason
        : result.message;
    throw new Error(message);
  }
  return {
    message: result.message,
    href: result.href,
    summary: result.summary,
    undo: result.undo,
    clientEffect: result.clientEffect,
  };
}

function metadata(draftId: string, conversationId = '', now = new Date().toISOString()) {
  return { conversationId, draftId, now };
}

export function executeImmediateAICommand(command: AICommand, workContext: AIWorkContext): AICommandResult {
  return asLegacyResult(executeLegacyAIAction({
    command,
    workContext,
    metadata: metadata(`legacy-${command.type}`),
  }));
}

export function executeConfirmedAICommand(
  command: AICommand,
  workContext: AIWorkContext,
  identifiers: { conversationId: string; draftId: string },
): AICommandResult {
  const now = new Date().toISOString();
  const first = executeLegacyAIAction({ command, workContext, metadata: metadata(identifiers.draftId, identifiers.conversationId, now) });
  if (first.status !== 'confirmation-required') return asLegacyResult(first);
  const mode = first.decision.mode;
  if (!isProofMode(mode)) return asLegacyResult(first);
  return asLegacyResult(executeLegacyAIAction({
    command,
    workContext,
    metadata: metadata(identifiers.draftId, identifiers.conversationId, now),
    confirmation: {
      id: `legacy-confirmation-${identifiers.draftId}`,
      fingerprint: first.decision.fingerprint,
      mode,
      confirmedAt: now,
      expiresAt: new Date(Date.parse(now) + 5 * 60_000).toISOString(),
    },
  }));
}

function isProofMode(mode: ConfirmationMode): mode is 'review' | 'explicit' | 'reinforced' {
  return mode === 'review' || mode === 'explicit' || mode === 'reinforced';
}

export function undoAICommand(
  receipt: AIUndoToken,
  workContext: AIWorkContext = { intent: 'search_patient', patientMode: 'none', selectedPatientId: '', selectedPlanId: '', selectedExerciseId: '' },
  identifiers: { conversationId?: string; draftId?: string } = {},
): AICommandResult {
  if (!('patches' in receipt)) throw new Error('Este cambio pertenece a una versión anterior y ya no puede deshacerse de forma segura.');
  const context = executionContext(workContext, metadata(identifiers.draftId ?? 'legacy-undo', identifiers.conversationId));
  const result = executeUndo(receipt, context);
  return { message: result.message, summary: result.summary };
}

export { invocationFromCommand };
