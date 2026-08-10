import type { AIUndoToken, AtalAIDraft, PrivateContactDraft } from '../types';
import { atalStorePort } from '../core/atalStorePort';
import { executeLegacyAIAction, groundDraftToExistingPatient, invocationFromDraft } from '../core/legacyAdapters';
import { fingerprintInvocation } from '../core/stableValue';

export function applyAtalAIDraft(
  draft: AtalAIDraft,
  privateContact: PrivateContactDraft,
  metadata: { conversationId: string; draftId: string; force?: boolean } = { conversationId: '', draftId: '', force: false },
) {
  const now = new Date().toISOString();
  const groundedDraft = groundDraftToExistingPatient(draft, atalStorePort.read().patients);
  const invocation = invocationFromDraft(groundedDraft, privateContact, { proposalId: groundedDraft.id, force: metadata.force });
  const result = executeLegacyAIAction({
    draft: groundedDraft,
    privateContact,
    workContext: {
      intent: groundedDraft.intent,
      patientMode: groundedDraft.selectedPatientId ? 'existing' : 'new',
      selectedPatientId: groundedDraft.selectedPatientId,
      selectedPlanId: groundedDraft.selectedPlanId,
      selectedExerciseId: groundedDraft.selectedExerciseId,
    },
    metadata: { ...metadata, now },
    confirmation: { id: `review-${groundedDraft.id}`, fingerprint: fingerprintInvocation(invocation), mode: 'review', confirmedAt: now, expiresAt: new Date(Date.parse(now) + 5 * 60_000).toISOString() },
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
