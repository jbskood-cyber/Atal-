import { createEntityId, mutateAtalStore, type SessionRecord } from '@/src/data/atalStore';
import { applyCompleteSession, applyRecordSessionStarted } from '@/src/domain/actions/sessionActions';
import type { GuidedPlan, GuidedSessionDraft } from './types';

export type ClinicalSessionRecord = SessionRecord & { planSnapshot?: GuidedPlan };

export function saveCompletedClinicalSession(patientId: string, planId: string, draft: GuidedSessionDraft) {
  let saved: ClinicalSessionRecord | undefined;
  mutateAtalStore((state) => {
    saved = applyCompleteSession(state, {
      patientId,
      planId,
      draft,
      now: draft.completedAt ?? new Date().toISOString(),
      createSessionId: () => createEntityId('session'),
      createEventId: () => createEntityId('event'),
      createNotificationId: () => createEntityId('notification'),
    }).session;
  });
  if (!saved) throw new Error('No se pudo guardar la sesión clínica.');
  return saved;
}

export function recordClinicalSessionStarted(patientId: string, planId: string, startedAt: string) {
  mutateAtalStore((state) => {
    applyRecordSessionStarted(state, {
      patientId,
      planId,
      startedAt,
      createEventId: () => createEntityId('event'),
    });
  });
}

export function sessionPlanSnapshot(session: SessionRecord) {
  return (session as ClinicalSessionRecord).planSnapshot ?? null;
}
