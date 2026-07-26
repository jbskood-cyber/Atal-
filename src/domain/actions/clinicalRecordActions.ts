import type { AtalState } from '../../data/atalStore';
import { actionError } from './contracts';

export type ClinicalRecordEntity = AtalState['clinicalRecords'][number];
export type ClinicalRecordPatch = Partial<Omit<ClinicalRecordEntity, 'id' | 'patientId' | 'version' | 'createdAt' | 'updatedAt'>>;

export type ClinicalRecordUpsertActionInput = {
  patientId: string;
  patch: ClinicalRecordPatch;
  recordId: string;
  versionId: string;
  now: string;
  createEventId: () => string;
};

function validatePlanOwnership(state: AtalState, patientId: string, planId: string | undefined): void {
  if (!planId) return;
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan || plan.patientId !== patientId) {
    throw actionError('CORE_PRECONDITION_FAILED', 'El plan indicado no pertenece al paciente.');
  }
}

function validatePainLevel(painLevel: number | null | undefined): void {
  if (painLevel === undefined || painLevel === null) return;
  if (!Number.isFinite(painLevel) || painLevel < 0 || painLevel > 10) {
    throw actionError('CORE_INPUT_INVALID', 'El dolor del expediente debe estar entre 0 y 10.');
  }
}

export function applyUpsertClinicalRecord(state: AtalState, input: ClinicalRecordUpsertActionInput) {
  const patient = state.patients.find((item) => item.id === input.patientId);
  if (!patient) throw actionError('CORE_ENTITY_NOT_FOUND', 'Paciente no encontrado.');

  validatePainLevel(input.patch.painLevel);
  validatePlanOwnership(state, patient.id, input.patch.planId);

  const existing = state.clinicalRecords.find((item) => item.patientId === patient.id);
  const eventId = input.createEventId();

  if (!existing) {
    const record: ClinicalRecordEntity = {
      id: input.recordId,
      patientId: patient.id,
      version: 1,
      date: input.patch.date ?? input.now,
      reasonForVisit: input.patch.reasonForVisit ?? '',
      evolution: input.patch.evolution ?? '',
      affectedArea: input.patch.affectedArea ?? patient.affectedArea,
      symptoms: structuredClone(input.patch.symptoms ?? []),
      painLevel: input.patch.painLevel ?? null,
      providedDiagnosis: input.patch.providedDiagnosis ?? '',
      functionalLimitations: structuredClone(input.patch.functionalLimitations ?? []),
      goals: structuredClone(input.patch.goals ?? []),
      relevantHistory: structuredClone(input.patch.relevantHistory ?? []),
      precautions: structuredClone(input.patch.precautions ?? []),
      clinicalNotes: input.patch.clinicalNotes ?? '',
      planId: input.patch.planId ?? '',
      professional: input.patch.professional ?? state.settings.professionalName,
      createdAt: input.now,
      updatedAt: input.now,
    };

    state.clinicalRecords.push(record);
    state.events.unshift({
      id: eventId,
      kind: 'record_created',
      patientId: patient.id,
      planId: record.planId || undefined,
      title: 'Expediente creado',
      detail: `Versión ${record.version}`,
      createdAt: input.now,
    });

    return { record, eventId, versionId: undefined as string | undefined };
  }

  const snapshot = structuredClone(existing);
  const immutableId = existing.id;
  const immutablePatientId = existing.patientId;
  const immutableCreatedAt = existing.createdAt;
  const immutableDate = existing.date;

  state.clinicalRecordVersions.push({
    id: input.versionId,
    recordId: existing.id,
    patientId: existing.patientId,
    version: existing.version,
    snapshot,
    createdAt: input.now,
  });

  Object.assign(existing, input.patch, {
    id: immutableId,
    patientId: immutablePatientId,
    version: existing.version + 1,
    date: immutableDate,
    createdAt: immutableCreatedAt,
    updatedAt: input.now,
  });

  state.events.unshift({
    id: eventId,
    kind: 'record_updated',
    patientId: patient.id,
    planId: existing.planId || undefined,
    title: 'Expediente actualizado',
    detail: `Versión ${existing.version}`,
    createdAt: input.now,
  });

  return { record: existing, eventId, versionId: input.versionId };
}
