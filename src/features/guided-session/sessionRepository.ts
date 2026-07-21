import {
  createEntityId,
  mutateAtalStore,
  saveCompletedSession,
  type ActivityEvent,
  type SessionRecord,
} from '@/src/data/atalStore';
import type { GuidedPlan, GuidedSessionDraft } from './types';

export type ClinicalSessionRecord = SessionRecord & { planSnapshot?: GuidedPlan };

export function saveCompletedClinicalSession(patientId: string, planId: string, draft: GuidedSessionDraft) {
  const saved = saveCompletedSession(patientId, planId, draft) as ClinicalSessionRecord;
  const snapshot = draft.planSnapshot ? structuredClone(draft.planSnapshot) : undefined;
  if (!snapshot) return saved;
  mutateAtalStore((state) => {
    const session = state.sessions.find((item) => item.id === saved.id) as ClinicalSessionRecord | undefined;
    if (session) session.planSnapshot = snapshot;
  });
  return { ...saved, planSnapshot: snapshot } as ClinicalSessionRecord;
}

export function recordClinicalSessionStarted(patientId: string, planId: string, startedAt: string) {
  mutateAtalStore((state) => {
    if (state.events.some((event) => event.kind === 'session_started' && event.patientId === patientId && event.planId === planId && event.createdAt === startedAt)) return;
    const patient = state.patients.find((item) => item.id === patientId);
    const event: ActivityEvent = {
      id: createEntityId('event'),
      kind: 'session_started',
      patientId,
      planId,
      title: 'Sesión iniciada',
      detail: patient?.name ?? 'Paciente',
      createdAt: startedAt,
    };
    state.events.unshift(event);
  });
}

export function sessionPlanSnapshot(session: SessionRecord) {
  return (session as ClinicalSessionRecord).planSnapshot ?? null;
}
