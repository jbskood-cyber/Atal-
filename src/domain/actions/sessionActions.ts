import type { AtalState, SessionRecord } from '../../data/atalStore';

export type ReviewSessionActionInput = {
  sessionId: string;
  observation: string;
  now: string;
  createEventId: () => string;
};

export type ReviewSessionActionResult = {
  session: SessionRecord;
};

export function applyReviewSession(state: AtalState, input: ReviewSessionActionInput): ReviewSessionActionResult {
  const session = state.sessions.find((item) => item.id === input.sessionId);
  if (!session) throw new Error('Sesión no encontrada.');

  const observation = input.observation.trim();
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
