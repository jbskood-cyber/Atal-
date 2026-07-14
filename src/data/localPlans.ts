export const LOCAL_PLANS_KEY = 'atal:local-plans:v1';

export type LocalPlanStatus = 'active' | 'draft' | 'archived';

export type LocalPlan = {
  id: string;
  patientId: string;
  title: string;
  focus: string;
  duration: string;
  frequency: string;
  goal: string;
  exerciseIds: string[];
  status: LocalPlanStatus;
  createdAt: string;
  updatedAt: string;
};

export type NewLocalPlan = Omit<LocalPlan, 'id' | 'createdAt' | 'updatedAt'>;

function isLocalPlan(value: unknown): value is LocalPlan {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LocalPlan>;
  return typeof item.id === 'string'
    && typeof item.patientId === 'string'
    && typeof item.title === 'string'
    && Array.isArray(item.exerciseIds)
    && item.exerciseIds.every((id) => typeof id === 'string')
    && typeof item.status === 'string'
    && typeof item.createdAt === 'string'
    && typeof item.updatedAt === 'string';
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `plan-${crypto.randomUUID()}`;
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readLocalPlans(): LocalPlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PLANS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLocalPlan) : [];
  } catch {
    return [];
  }
}

export function writeLocalPlans(items: LocalPlan[]) {
  window.localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(items));
}

export function createLocalPlan(input: NewLocalPlan): LocalPlan {
  const timestamp = new Date().toISOString();
  const plan: LocalPlan = {
    ...input,
    id: createLocalId(),
    patientId: input.patientId.trim(),
    title: input.title.trim(),
    exerciseIds: [...new Set(input.exerciseIds)],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeLocalPlans([...readLocalPlans(), plan]);
  return plan;
}

export function getPatientLocalPlans(patientId: string) {
  return readLocalPlans()
    .filter((plan) => plan.patientId === patientId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCurrentPatientLocalPlan(patientId: string) {
  const plans = getPatientLocalPlans(patientId);
  return plans.find((plan) => plan.status === 'active') ?? plans[0] ?? null;
}

export function getLocalPlanById(id: string) {
  return readLocalPlans().find((plan) => plan.id === id) ?? null;
}
