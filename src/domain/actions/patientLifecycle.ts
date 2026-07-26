import type { ActivityEvent, AtalState, PatientEntity } from '@/src/data/atalStore';

export type PatientLifecycleActionInput = {
  patientId: string;
  archived: boolean;
  now: string;
  createEventId: () => string;
};

export type PatientLifecycleActionResult = {
  patient: PatientEntity;
  pausedPlanIds: string[];
  eventIds: string[];
};

function pushEvent(state: AtalState, event: Omit<ActivityEvent, 'id'>, createEventId: () => string) {
  const id = createEventId();
  state.events.unshift({ id, ...event });
  return id;
}

export function applyPatientLifecycle(
  state: AtalState,
  input: PatientLifecycleActionInput,
): PatientLifecycleActionResult {
  const patient = state.patients.find((item) => item.id === input.patientId);
  if (!patient) throw new Error('Paciente no encontrado.');

  patient.status = input.archived ? 'archived' : 'active';
  patient.updatedAt = input.now;

  const eventIds: string[] = [];
  eventIds.push(pushEvent(state, {
    kind: input.archived ? 'patient_archived' : 'patient_restored',
    patientId: patient.id,
    title: input.archived ? 'Paciente archivado' : 'Paciente restaurado',
    detail: patient.name,
    createdAt: input.now,
  }, input.createEventId));

  const pausedPlanIds: string[] = [];
  if (input.archived) {
    for (const plan of state.plans.filter((item) => item.patientId === patient.id && item.status === 'active')) {
      plan.status = 'paused';
      plan.updatedAt = input.now;
      pausedPlanIds.push(plan.id);
      eventIds.push(pushEvent(state, {
        kind: 'plan_paused',
        patientId: patient.id,
        planId: plan.id,
        title: 'Plan pausado',
        detail: `${plan.title} · paciente archivado`,
        createdAt: input.now,
      }, input.createEventId));
    }
  }

  return { patient, pausedPlanIds, eventIds };
}
