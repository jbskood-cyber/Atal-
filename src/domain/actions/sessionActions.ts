import type { AtalState, SessionRecord } from '../../data/atalStore';
import type { GuidedPlan, GuidedSessionDraft } from '../../features/guided-session/types';

const MAX_CLINICAL_OBSERVATION_LENGTH = 2_000;

type ClinicalSessionRecord = SessionRecord & { planSnapshot?: GuidedPlan };

export type ReviewSessionActionInput = {
  sessionId: string;
  observation: string;
  now: string;
  createEventId: () => string;
};

export type ReviewSessionActionResult = {
  session: SessionRecord;
};

export type RecordSessionStartedInput = {
  patientId: string;
  planId: string;
  startedAt: string;
  createEventId: () => string;
};

export type CompleteSessionActionInput = {
  patientId: string;
  planId: string;
  draft: GuidedSessionDraft;
  now: string;
  createSessionId: () => string;
  createEventId: () => string;
  createNotificationId: () => string;
};

export type CompleteSessionActionResult = {
  session: ClinicalSessionRecord;
  created: boolean;
};

function requirePatientPlan(state: AtalState, patientId: string, planId: string) {
  const patient = state.patients.find((item) => item.id === patientId);
  if (!patient) throw new Error('El paciente ya no existe.');
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) throw new Error('El plan ya no existe.');
  if (plan.patientId !== patientId) throw new Error('El plan no pertenece al paciente.');
  return { patient, plan };
}

export function applyRecordSessionStarted(state: AtalState, input: RecordSessionStartedInput) {
  const { patient } = requirePatientPlan(state, input.patientId, input.planId);
  const existing = state.events.find((event) =>
    event.kind === 'session_started'
    && event.patientId === input.patientId
    && event.planId === input.planId
    && event.createdAt === input.startedAt,
  );
  if (existing) return { event: existing, created: false };

  const event = {
    id: input.createEventId(),
    kind: 'session_started' as const,
    patientId: input.patientId,
    planId: input.planId,
    title: 'Sesión iniciada',
    detail: patient.name,
    createdAt: input.startedAt,
  };
  state.events.unshift(event);
  return { event, created: true };
}

export function applyCompleteSession(state: AtalState, input: CompleteSessionActionInput): CompleteSessionActionResult {
  const { patient } = requirePatientPlan(state, input.patientId, input.planId);
  if (input.draft.patientId !== input.patientId || input.draft.planId !== input.planId) {
    throw new Error('La sesión no corresponde al paciente y plan indicados.');
  }

  const completedAt = input.draft.completedAt ?? input.now;
  const startedAt = input.draft.startedAt ?? completedAt;
  const existing = state.sessions.find((item) => item.patientId === input.patientId && item.planId === input.planId && item.startedAt === startedAt) as ClinicalSessionRecord | undefined;
  if (existing) return { session: existing, created: false };

  const durationMinutes = Math.max(1, Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 60_000));
  const session: ClinicalSessionRecord = {
    id: input.createSessionId(),
    patientId: input.patientId,
    planId: input.planId,
    startedAt,
    completedAt,
    status: input.draft.status === 'completed' ? 'completed' : 'partial',
    startPain: input.draft.start.pain,
    startEnergy: input.draft.start.energy,
    startComment: input.draft.start.comment,
    exercises: structuredClone(input.draft.exercises),
    endPain: input.draft.end.pain,
    endEnergy: input.draft.end.energy,
    effort: input.draft.end.effort,
    symptoms: structuredClone(input.draft.end.symptoms),
    comment: input.draft.end.comment,
    easiest: input.draft.end.easiest,
    hardest: input.draft.end.hardest,
    discomfort: input.draft.end.discomfort,
    durationMinutes,
    clinicalObservation: '',
    createdAt: completedAt,
    updatedAt: completedAt,
    ...(input.draft.planSnapshot ? { planSnapshot: structuredClone(input.draft.planSnapshot) } : {}),
  };

  state.sessions.unshift(session);
  state.events.unshift({
    id: input.createEventId(),
    kind: session.status === 'completed' ? 'session_completed' : 'session_partial',
    patientId: input.patientId,
    planId: input.planId,
    sessionId: session.id,
    title: session.status === 'completed' ? 'Sesión completada' : 'Sesión parcial',
    detail: patient.name,
    createdAt: completedAt,
  });

  if (state.settings.notifications) {
    const alert = session.endPain >= 7 || session.symptoms.some((item) => !['ninguno', 'otro'].includes(item));
    state.notifications.unshift({
      id: input.createNotificationId(),
      title: alert ? 'Sesión requiere atención' : 'Sesión lista para revisar',
      detail: `${patient.name} · Dolor ${session.endPain}/10`,
      severity: alert ? 'urgent' : 'attention',
      href: `/activity/${session.id}`,
      read: false,
      createdAt: completedAt,
    });
  }

  return { session, created: true };
}

export function applyReviewSession(state: AtalState, input: ReviewSessionActionInput): ReviewSessionActionResult {
  const session = state.sessions.find((item) => item.id === input.sessionId);
  if (!session) throw new Error('La sesión ya no existe.');

  const observation = input.observation.trim();
  if (observation.length > MAX_CLINICAL_OBSERVATION_LENGTH) {
    throw new Error(`La observación clínica supera ${MAX_CLINICAL_OBSERVATION_LENGTH} caracteres.`);
  }

  session.clinicalObservation = observation;
  session.reviewedAt = input.now;
  session.updatedAt = input.now;

  state.events.unshift({
    id: input.createEventId(),
    kind: 'report_reviewed',
    patientId: session.patientId,
    planId: session.planId,
    sessionId: session.id,
    title: 'Reporte revisado',
    detail: observation || 'Sin observación adicional',
    createdAt: input.now,
  });

  state.notifications = state.notifications.map((item) =>
    item.href === `/activity/${session.id}` ? { ...item, read: true } : item,
  );

  return { session };
}
