import type { ActivityEvent, AtalState, PatientEntity, PlanEntity } from '../../data/atalStore';

export type ActivityQueryState = Pick<AtalState, 'patients' | 'plans'>;
export type ActivityIndex = {
  patientById: Map<string, PatientEntity>;
  planById: Map<string, PlanEntity>;
};

export function buildActivityIndex(state: ActivityQueryState): ActivityIndex {
  return {
    patientById: new Map(state.patients.map((patient) => [patient.id, patient])),
    planById: new Map(state.plans.map((plan) => [plan.id, plan])),
  };
}

export function filterActivityTimeline(events: ActivityEvent[], index: ActivityIndex, patientId = '', normalizedQuery = ''): ActivityEvent[] {
  return [...events]
    .filter((event) => !patientId || event.patientId === patientId)
    .filter((event) => {
      if (!normalizedQuery) return true;
      const patient = event.patientId ? index.patientById.get(event.patientId) : undefined;
      const plan = event.planId ? index.planById.get(event.planId) : undefined;
      return `${event.title} ${event.detail} ${patient?.name ?? ''} ${plan?.title ?? ''}`.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
