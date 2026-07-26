import type { AtalState, PatientEntity, PlanEntity, SessionRecord } from '../../data/atalStore';

export type PatientCatalogState = Pick<AtalState, 'patients' | 'plans' | 'sessions'>;
export type PatientCatalogView = PatientEntity & { plan: string; progress: number; time: string; adherence: number };
export type PatientCatalogIndex = {
  activePlanByPatient: Map<string, PlanEntity>;
  latestSessionByPatient: Map<string, SessionRecord>;
  sessionStatsByPlan: Map<string, { total: number; completed: number }>;
};

export function buildPatientCatalogIndex(state: PatientCatalogState): PatientCatalogIndex {
  const activePlanByPatient = new Map<string, PlanEntity>();
  const latestSessionByPatient = new Map<string, SessionRecord>();
  const sessionStatsByPlan = new Map<string, { total: number; completed: number }>();

  for (const plan of state.plans) {
    if (plan.status === 'active' && !activePlanByPatient.has(plan.patientId)) activePlanByPatient.set(plan.patientId, plan);
  }

  for (const session of state.sessions) {
    if (!latestSessionByPatient.has(session.patientId)) latestSessionByPatient.set(session.patientId, session);
    const current = sessionStatsByPlan.get(session.planId) ?? { total: 0, completed: 0 };
    current.total += 1;
    if (session.status === 'completed') current.completed += 1;
    sessionStatsByPlan.set(session.planId, current);
  }

  return { activePlanByPatient, latestSessionByPatient, sessionStatsByPlan };
}

function toView(patient: PatientEntity, index: PatientCatalogIndex): PatientCatalogView {
  const active = index.activePlanByPatient.get(patient.id);
  const stats = active ? index.sessionStatsByPlan.get(active.id) : undefined;
  const completed = stats?.completed ?? 0;
  const total = stats?.total ?? 0;
  const progress = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const latest = index.latestSessionByPatient.get(patient.id);
  return {
    ...patient,
    plan: active?.title ?? 'Sin plan activo',
    progress,
    adherence: total ? Math.round((completed / total) * 100) : 0,
    time: latest ? new Date(latest.completedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Sin sesiones',
  };
}

export function buildPatientCatalog(state: PatientCatalogState, index = buildPatientCatalogIndex(state)): PatientCatalogView[] {
  return state.patients.map((patient) => toView(patient, index));
}

export function buildPatientView(state: PatientCatalogState, patientId: string, index = buildPatientCatalogIndex(state)): PatientCatalogView | null {
  const patient = state.patients.find((item) => item.id === patientId);
  return patient ? toView(patient, index) : null;
}
