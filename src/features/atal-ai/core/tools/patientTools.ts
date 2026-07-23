import { coreError, type EntityRef, type ToolDefinition } from '../contracts';
import type { ClinicalRecord } from '@/src/features/clinical-record/types';
import { normalizeEntityLabel } from '../stableValue';
import { materializeExercises, validateDraftInput, type DraftToolInput } from './exerciseTools';

type AddNoteInput = { patient: EntityRef; content: string };

export const patientTools: ToolDefinition[] = [
  {
    name: 'patient.create_with_record_and_plan', version: 1, risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000,
    requiredEntities: [],
    validateInput(input) {
      const value = validateDraftInput(input, 'create_patient_plan');
      if (!value.draft.patient.name.trim()) throw coreError('CORE_INPUT_INVALID', 'Añade el nombre del paciente.');
      if (!value.draft.plan.title.trim()) throw coreError('CORE_INPUT_INVALID', 'Añade un título al plan.');
      return value;
    },
    preconditions(environment, input) {
      const name = normalizeEntityLabel((input as DraftToolInput).draft.patient.name);
      if (environment.state.patients.some((patient) => normalizeEntityLabel(patient.name) === name)) {
        throw coreError('CORE_ENTITY_AMBIGUOUS', 'Ya existe un paciente con ese nombre. Elige usarlo o crea una propuesta distinta.');
      }
    },
    execute(environment, input) {
      const { draft, privateContact } = input as DraftToolInput;
      const patientId = `${environment.transactionId}-patient`;
      const planId = `${environment.transactionId}-plan`;
      const recordId = `${environment.transactionId}-record`;
      const exercises = materializeExercises(environment, draft.exercises);
      if (draft.plan.status === 'active' && !exercises.exerciseIds.length) throw coreError('CORE_PRECONDITION_FAILED', 'Un plan activo requiere al menos un ejercicio.');
      const patient = {
        id: patientId, name: draft.patient.name.trim(), diagnosis: draft.patient.providedDiagnosis || draft.patient.reasonForVisit || 'Motivo por completar',
        age: draft.patient.age, birthDate: draft.patient.birthDate, sex: draft.patient.sex, affectedArea: draft.patient.affectedArea,
        status: 'active' as const, visitType: 'first' as const, contact: structuredClone(privateContact),
        createdAt: environment.context.now, updatedAt: environment.context.now,
      };
      const plan = {
        id: planId, patientId, title: draft.plan.title.trim(), focus: draft.plan.focus, duration: durationText(draft),
        frequency: frequencyText(draft), goal: draft.plan.goal, exerciseIds: exercises.exerciseIds, status: draft.plan.status,
        progression: draft.plan.phases.join('\n'), reportCriteria: draft.plan.progressCriteria || 'Reportar dolor elevado, síntomas o imposibilidad para completar.',
        generalInstructions: draft.plan.generalInstructions, createdAt: environment.context.now, updatedAt: environment.context.now,
      };
      const record: ClinicalRecord = recordFromDraft(draft, recordId, patientId, planId, environment.context.now, environment.state.settings.professionalName);
      environment.state.patients.push(patient);
      environment.state.clinicalRecords.push(record);
      environment.state.plans.push(plan);
      const summary = ['Paciente creado.', 'Expediente creado.', ...exercises.summary, `Plan creado como ${plan.status === 'active' ? 'activo' : 'borrador'}.`];
      return {
        status: 'success', message: summary.join(' '), summary,
        data: { patientId, clinicalRecordId: recordId, planId, exerciseId: exercises.firstCreatedId },
        href: `/patients/${patientId}`,
        affected: [{ type: 'patient', id: patientId }, { type: 'clinical-record', id: recordId }, ...exercises.affected, { type: 'plan', id: planId }],
      };
    },
  },
  {
    name: 'patient_record.update', version: 1, risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000,
    requiredEntities: ['patient'],
    validateInput: (input) => validateDraftInput(input, 'update_patient_record'),
    preconditions(environment, input) {
      const { draft, force } = input as DraftToolInput;
      const patient = environment.state.patients.find((item) => item.id === environment.resolved.patient?.id);
      const record = environment.state.clinicalRecords.find((item) => item.patientId === patient?.id);
      if (!patient || !record) throw coreError('CORE_PRECONDITION_FAILED', 'El paciente o expediente ya no existe.');
      checkVersion(draft.baseVersions.patientUpdatedAt, patient.updatedAt, force, 'paciente');
      checkVersion(draft.baseVersions.recordUpdatedAt, record.updatedAt, force, 'expediente');
    },
    execute(environment, input) {
      const { draft } = input as DraftToolInput;
      const patient = environment.state.patients.find((item) => item.id === environment.resolved.patient?.id)!;
      const index = environment.state.clinicalRecords.findIndex((item) => item.patientId === patient.id);
      const before = structuredClone(environment.state.clinicalRecords[index]);
      environment.state.clinicalRecordVersions.push({
        id: `${environment.transactionId}-record-version`, recordId: before.id, patientId: patient.id,
        version: before.version, snapshot: before, createdAt: environment.context.now,
      });
      const updated = updateRecordFromDraft(before, draft, environment.context.now);
      environment.state.clinicalRecords[index] = updated;
      patient.age = draft.patient.age ?? patient.age;
      patient.birthDate = draft.patient.birthDate.trim() || patient.birthDate;
      patient.affectedArea = draft.patient.affectedArea.trim() || patient.affectedArea;
      patient.diagnosis = (draft.patient.providedDiagnosis || draft.patient.reasonForVisit).trim() || patient.diagnosis;
      patient.updatedAt = environment.context.now;
      return {
        status: 'success', message: 'Paciente y expediente actualizados.', summary: ['Paciente actualizado.', 'Expediente actualizado.'],
        data: { patientId: patient.id, clinicalRecordId: updated.id }, href: `/patients/${patient.id}`,
        affected: [{ type: 'patient', id: patient.id }, { type: 'clinical-record', id: updated.id }],
      };
    },
  },
  {
    name: 'patient_note.add',
    version: 1,
    risk: 'reversible-write',
    mutates: true,
    supportsUndo: true,
    undoTtlMs: 30_000,
    requiredEntities: ['patient'],
    validateInput(input): AddNoteInput {
      if (!input || typeof input !== 'object') throw coreError('CORE_INPUT_INVALID', 'La nota no es válida.');
      const value = input as Record<string, unknown>;
      const patient = value.patient as EntityRef;
      const content = typeof value.content === 'string' ? value.content.trim() : '';
      if (!patient || patient.type !== 'patient') throw coreError('CORE_INPUT_INVALID', 'Selecciona un paciente válido.');
      if (!content) throw coreError('CORE_INPUT_INVALID', 'Escribe la nota clínica.');
      if (content.length > 10_000) throw coreError('CORE_INPUT_INVALID', 'La nota supera el máximo de 10,000 caracteres.');
      return { patient, content };
    },
    preconditions(environment) {
      if (!environment.state.patients.some((patient) => patient.id === environment.resolved.patient?.id)) {
        throw coreError('CORE_PRECONDITION_FAILED', 'El paciente ya no existe.');
      }
    },
    execute(environment, input) {
      const { content } = input as AddNoteInput;
      const patient = environment.resolved.patient!;
      const note = {
        id: `${environment.transactionId}-note`,
        patientId: patient.id,
        content,
        professional: environment.state.settings.professionalName,
        createdAt: environment.context.now,
        updatedAt: environment.context.now,
      };
      environment.state.notes.unshift(note);
      return {
        status: 'success',
        message: `Nota añadida al historial de ${patient.name}.`,
        summary: [`Nota añadida a ${patient.name}.`],
        href: `/patients/${patient.id}`,
        affected: [{ type: 'patient', id: patient.id }],
      };
    },
  },
];

function durationText(draft: DraftToolInput['draft']): string {
  const value = draft.plan.duration;
  if (value.customText.trim()) return value.customText.trim();
  if (value.value === null) return 'Por definir';
  return `${value.value} ${value.unit === 'days' ? 'días' : value.unit === 'months' ? 'meses' : 'semanas'}`;
}

function frequencyText(draft: DraftToolInput['draft']): string {
  const value = draft.plan.frequency;
  if (value.customText.trim()) return value.customText.trim();
  if (value.value === null) return 'Por definir';
  return `${value.value} ${value.value === 1 ? 'vez' : 'veces'} por ${value.period === 'day' ? 'día' : value.period === 'month' ? 'mes' : 'semana'}`;
}

function recordFromDraft(draft: DraftToolInput['draft'], id: string, patientId: string, planId: string, now: string, professional: string): ClinicalRecord {
  return {
    id, patientId, version: 1, date: now, reasonForVisit: draft.patient.reasonForVisit, evolution: draft.patient.evolutionTime,
    affectedArea: draft.patient.affectedArea, symptoms: draft.patient.symptoms, painLevel: draft.patient.painLevel,
    providedDiagnosis: draft.patient.providedDiagnosis, functionalLimitations: draft.patient.functionalLimitations,
    goals: draft.patient.goals, relevantHistory: draft.patient.relevantHistory, precautions: draft.patient.precautions,
    clinicalNotes: draft.patient.clinicalNotes, planId, professional, createdAt: now, updatedAt: now,
  };
}

function updateRecordFromDraft(before: ClinicalRecord, draft: DraftToolInput['draft'], now: string): ClinicalRecord {
  const filled = (next: string, current: string) => next.trim() || current;
  return {
    ...before, version: before.version + 1, date: now,
    reasonForVisit: filled(draft.patient.reasonForVisit, before.reasonForVisit),
    evolution: filled(draft.patient.evolutionTime, before.evolution), affectedArea: filled(draft.patient.affectedArea, before.affectedArea),
    symptoms: draft.patient.symptoms.length ? draft.patient.symptoms : before.symptoms, painLevel: draft.patient.painLevel ?? before.painLevel,
    providedDiagnosis: filled(draft.patient.providedDiagnosis, before.providedDiagnosis),
    functionalLimitations: draft.patient.functionalLimitations.length ? draft.patient.functionalLimitations : before.functionalLimitations,
    goals: draft.patient.goals.length ? draft.patient.goals : before.goals,
    relevantHistory: draft.patient.relevantHistory.length ? draft.patient.relevantHistory : before.relevantHistory,
    precautions: draft.patient.precautions.length ? draft.patient.precautions : before.precautions,
    clinicalNotes: filled(draft.patient.clinicalNotes, before.clinicalNotes), updatedAt: now,
  };
}

export function checkVersion(expected: string, actual: string, force: boolean, label: string): void {
  if (!force && expected && expected !== actual) throw coreError('CORE_VERSION_CONFLICT', `El ${label} cambió después de crear el borrador.`);
}

export { durationText, frequencyText, recordFromDraft, updateRecordFromDraft };
