import type { AtalState, PatientEntity, SessionRecord } from '../../data/atalStore';

export type HomeDashboardState = Pick<AtalState, 'patients' | 'plans' | 'sessions'>;
export type HomePendingReport = SessionRecord & { urgent: boolean };

export type HomeDashboard = {
  activePatientCount: number;
  activePlanCount: number;
  pendingReportCount: number;
  pendingReports: HomePendingReport[];
  recentReports: SessionRecord[];
  patientsWithoutPlan: PatientEntity[];
  patientById: Map<string, PatientEntity>;
};

export function buildHomeDashboard(state: HomeDashboardState): HomeDashboard {
  const patientById = new Map(state.patients.map((patient) => [patient.id, patient]));
  const activeOrDraftPlanPatients = new Set<string>();
  let activePlanCount = 0;

  for (const plan of state.plans) {
    if (plan.status === 'active') activePlanCount += 1;
    if (plan.status === 'active' || plan.status === 'draft') activeOrDraftPlanPatients.add(plan.patientId);
  }

  const activePatients = state.patients.filter((patient) => patient.status !== 'archived');
  const patientsWithoutPlan = activePatients.filter((patient) => !activeOrDraftPlanPatients.has(patient.id));
  const sortedSessions = [...state.sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const pendingReports = sortedSessions.filter((session) => !session.reviewedAt).map((session) => ({
    ...session,
    urgent: session.endPain >= 7 || session.symptoms.some((item) => !['ninguno', 'otro'].includes(item)),
  }));

  return {
    activePatientCount: activePatients.length,
    activePlanCount,
    pendingReportCount: pendingReports.length,
    pendingReports,
    recentReports: sortedSessions.slice(0, 3),
    patientsWithoutPlan,
    patientById,
  };
}
