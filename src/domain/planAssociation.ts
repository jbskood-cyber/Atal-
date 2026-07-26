import type { AtalState } from '@/src/data/atalStore';

export function resolveAssociatedPlanId(state: AtalState, patientId: string, preferredPlanId = '') {
  const plans = state.plans.filter((plan) => plan.patientId === patientId);
  const newest = (items: typeof plans) => [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const active = newest(plans.filter((plan) => plan.status === 'active'));
  if (active) return active.id;
  const preferred = plans.find((plan) => plan.id === preferredPlanId && plan.status !== 'archived');
  if (preferred) return preferred.id;
  return newest(plans.filter((plan) => plan.status !== 'archived'))?.id ?? '';
}

export function syncClinicalRecordPlanAssociation(
  state: AtalState,
  patientId: string,
  preferredPlanId = '',
  updatedAt = new Date().toISOString(),
) {
  const planId = resolveAssociatedPlanId(state, patientId, preferredPlanId);
  for (const record of state.clinicalRecords.filter((item) => item.patientId === patientId)) {
    if (record.planId === planId) continue;
    record.planId = planId;
    record.updatedAt = updatedAt;
  }
  return planId;
}

export function syncClinicalRecordPlanAssociationVersioned(
  state: AtalState,
  patientId: string,
  preferredPlanId: string,
  updatedAt: string,
  createVersionId: () => string,
) {
  const planId = resolveAssociatedPlanId(state, patientId, preferredPlanId);
  let changed = false;
  for (const record of state.clinicalRecords.filter((item) => item.patientId === patientId)) {
    if (record.planId === planId) continue;
    const snapshot = structuredClone(record);
    state.clinicalRecordVersions.push({
      id: createVersionId(),
      recordId: record.id,
      patientId: record.patientId,
      version: record.version,
      snapshot,
      createdAt: updatedAt,
    });
    record.planId = planId;
    record.version += 1;
    record.updatedAt = updatedAt;
    changed = true;
  }
  return { planId, changed };
}
