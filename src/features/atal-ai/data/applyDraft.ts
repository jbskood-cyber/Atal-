import type { AIUndoToken, AtalAIDraft, PrivateContactDraft } from '../types';
import { executeLegacyAIAction, invocationFromDraft } from '../core/legacyAdapters';
import { fingerprintInvocation } from '../core/stableValue';

export function applyAtalAIDraft(
  draft: AtalAIDraft,
  privateContact: PrivateContactDraft,
  metadata: { conversationId: string; draftId: string; force?: boolean } = { conversationId: '', draftId: '', force: false },
) {
  const now = new Date().toISOString();
  const invocation = invocationFromDraft(draft, privateContact, { proposalId: draft.id, force: metadata.force });
  const result = executeLegacyAIAction({
    draft,
    privateContact,
    workContext: { intent: draft.intent, patientMode: draft.selectedPatientId ? 'existing' : 'new', selectedPatientId: draft.selectedPatientId, selectedPlanId: draft.selectedPlanId, selectedExerciseId: draft.selectedExerciseId },
    metadata: { ...metadata, now },
    confirmation: { id: `review-${draft.id}`, fingerprint: fingerprintInvocation(invocation), mode: 'review', confirmedAt: now, expiresAt: new Date(Date.parse(now) + 5 * 60_000).toISOString() },
  });
  if (result.status !== 'success') {
    const message = result.status === 'clarification'
      ? result.clarification.message
      : result.status === 'confirmation-required'
        ? result.decision.reason
        : result.message;
    throw new Error(message);
  }
  const data = (result.data ?? {}) as { patientId?: string; planId?: string; clinicalRecordId?: string; exerciseId?: string };
  return { ...data, summary: result.summary, undo: result.undo as AIUndoToken | undefined };
}
