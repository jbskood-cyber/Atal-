import type { PatientEntity } from '@/src/data/atalStore';
import { applyUpsertClinicalRecord } from '../../../../domain/actions/clinicalRecordActions';
import { applyCreatePatient, applyUpdatePatient } from '../../../../domain/actions/patientActions';
import { applyPatientLifecycle } from '../../../../domain/actions/patientLifecycle';
import type { ClinicalRecord } from '@/src/features/clinical-record/types';
import { coreError, type EntityRef, type ToolDefinition } from '../contracts';

function objectInput(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw coreError('CORE_INPUT_INVALID', message);
  return input as Record<string, unknown>;
}

function ref(value: unknown, type: EntityRef['type']): EntityRef {
  if (!value || typeof value !== 'object' || (value as EntityRef).type !== type) {
    throw coreError('CORE_INPUT_INVALID', `Selecciona una referencia ${type} válida.`);
  }
  return value as EntityRef;
}

function text(value: unknown, max = 10_000): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw coreError('CORE_INPUT_INVALID', 'Uno de los textos no es válido.');
  const normalized = value.trim();
  if (normalized.length > max) throw coreError('CORE_INPUT_INVALID', `El texto supera ${max} caracteres.`);
  return normalized;
}

function stringList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw coreError('CORE_INPUT_INVALID', 'La lista indicada no es válida.');
  }
  return value.map((item) => item.trim()).filter(Boolean).slice(0, 100);
}

function optionalNumber(value: unknown, min: number, max: number): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw coreError('CORE_INPUT_INVALID', `El valor debe estar entre ${min} y ${max}.`);
  return parsed;
}

type PatientCreateInput = {
  name: string;
  diagnosis: string;
  age: number | null;
  birthDate: string;
  sex: string;
  affectedArea: string;
  visitType: PatientEntity['visitType'];
  contact: PatientEntity['contact'];
  record: {
    reasonForVisit: string;
    evolution: string;
    symptoms: string[];
    painLevel: number | null;
    providedDiagnosis: string;
    functionalLimitations: string[];
    goals: string[];
    relevantHistory: string[];
    precautions: string[];
    clinicalNotes: string;
  };
  plan?: {
    title: string;
    focus: string;
    duration: string;
    frequency: string;
    goal: string;
    exerciseIds: string[];
    status: 'draft' | 'active';
    progression: string;
    reportCriteria: string;
    generalInstructions: string;
  };
};

type PatientUpdateInput = {
  patient: EntityRef;
  patch: Partial<Pick<PatientEntity, 'name' | 'diagnosis' | 'age' | 'birthDate' | 'sex' | 'affectedArea' | 'visitType'>> & {
    contact?: Partial<PatientEntity['contact']>;
  };
};

type RecordUpsertInput = {
  patient: EntityRef;
  patch: Partial<Pick<ClinicalRecord,
    'reasonForVisit' | 'evolution' | 'affectedArea' | 'symptoms' | 'painLevel' | 'providedDiagnosis'
    | 'functionalLimitations' | 'goals' | 'relevantHistory' | 'precautions' | 'clinicalNotes' | 'planId'>>;
};

function validatePatientCreate(input: unknown): PatientCreateInput {
  const value = objectInput(input, 'Los datos del paciente no son válidos.');
  const patient = objectInput(value.patient, 'Faltan los datos del paciente.');
  const record = value.record === undefined ? {} : objectInput(value.record, 'Los datos del expediente no son válidos.');
  const planValue = value.plan === undefined ? undefined : objectInput(value.plan, 'Los datos del plan no son válidos.');
  const name = text(patient.name, 180) ?? '';
  if (!name) throw coreError('CORE_INPUT_INVALID', 'Añade el nombre del paciente.');
  const age = optionalNumber(patient.age, 0, 130) ?? null;
  const painLevel = optionalNumber(record.painLevel, 0, 10) ?? null;
  const visitType = patient.visitType === 'followup' ? 'followup' : 'first';
  const plan = planValue ? {
    title: text(planValue.title, 220) ?? '',
    focus: text(planValue.focus, 500) ?? '',
    duration: text(planValue.duration, 120) ?? 'Por definir',
    frequency: text(planValue.frequency, 120) ?? 'Por definir',
    goal: text(planValue.goal, 2_000) ?? '',
    exerciseIds: stringList(planValue.exerciseIds) ?? [],
    status: planValue.status === 'active' ? 'active' as const : 'draft' as const,
    progression: text(planValue.progression, 5_000) ?? '',
    reportCriteria: text(planValue.reportCriteria, 5_000) ?? '',
    generalInstructions: text(planValue.generalInstructions, 5_000) ?? '',
  } : undefined;
  if (plan && !plan.title) throw coreError('CORE_INPUT_INVALID', 'El plan incluido necesita un título.');
  if (plan?.status === 'active' && plan.exerciseIds.length === 0) throw coreError('CORE_INPUT_INVALID', 'Un plan activo necesita al menos un ejercicio existente.');
  return {
    name,
    diagnosis: text(patient.diagnosis, 1_000) ?? text(record.providedDiagnosis, 1_000) ?? text(record.reasonForVisit, 1_000) ?? 'Motivo por completar',
    age,
    birthDate: text(patient.birthDate, 40) ?? '',
    sex: text(patient.sex, 80) ?? '',
    affectedArea: text(patient.affectedArea, 300) ?? text(record.affectedArea, 300) ?? '',
    visitType,
    contact: {
      phone: text(patient.phone, 80) ?? '',
      email: text(patient.email, 180) ?? '',
      address: text(patient.address, 500) ?? '',
      emergencyContact: text(patient.emergencyContact, 300) ?? '',
    },
    record: {
      reasonForVisit: text(record.reasonForVisit, 2_000) ?? '',
      evolution: text(record.evolution, 2_000) ?? '',
      symptoms: stringList(record.symptoms) ?? [],
      painLevel,
      providedDiagnosis: text(record.providedDiagnosis, 2_000) ?? '',
      functionalLimitations: stringList(record.functionalLimitations) ?? [],
      goals: stringList(record.goals) ?? [],
      relevantHistory: stringList(record.relevantHistory) ?? [],
      precautions: stringList(record.precautions) ?? [],
      clinicalNotes: text(record.clinicalNotes, 10_000) ?? '',
    },
    plan,
  };
}

function validatePatientUpdate(input: unknown): PatientUpdateInput {
  const value = objectInput(input, 'La actualización del paciente no es válida.');
  const patchValue = objectInput(value.patch, 'No se indicaron cambios para el paciente.');
  const contactValue = patchValue.contact === undefined ? undefined : objectInput(patchValue.contact, 'El contacto no es válido.');
  const patch: PatientUpdateInput['patch'] = {};
  const name = text(patchValue.name, 180); if (name !== undefined) patch.name = name;
  const diagnosis = text(patchValue.diagnosis, 1_000); if (diagnosis !== undefined) patch.diagnosis = diagnosis;
  const age = optionalNumber(patchValue.age, 0, 130); if (age !== undefined) patch.age = age;
  const birthDate = text(patchValue.birthDate, 40); if (birthDate !== undefined) patch.birthDate = birthDate;
  const sex = text(patchValue.sex, 80); if (sex !== undefined) patch.sex = sex;
  const affectedArea = text(patchValue.affectedArea, 300); if (affectedArea !== undefined) patch.affectedArea = affectedArea;
  if (patchValue.visitType !== undefined) patch.visitType = patchValue.visitType === 'followup' ? 'followup' : 'first';
  if (contactValue) {
    patch.contact = {};
    for (const key of ['phone', 'email', 'address', 'emergencyContact'] as const) {
      const next = text(contactValue[key], key === 'address' ? 500 : 300);
      if (next !== undefined) patch.contact[key] = next;
    }
  }
  if (Object.keys(patch).length === 0) throw coreError('CORE_INPUT_INVALID', 'No se indicaron cambios para el paciente.');
  return { patient: ref(value.patient, 'patient'), patch };
}

function validateRecordUpsert(input: unknown): RecordUpsertInput {
  const value = objectInput(input, 'La actualización del expediente no es válida.');
  const patchValue = objectInput(value.patch, 'No se indicaron cambios para el expediente.');
  const patch: RecordUpsertInput['patch'] = {};
  for (const key of ['reasonForVisit', 'evolution', 'affectedArea', 'providedDiagnosis', 'clinicalNotes', 'planId'] as const) {
    const next = text(patchValue[key], key === 'clinicalNotes' ? 10_000 : 2_000);
    if (next !== undefined) patch[key] = next;
  }
  for (const key of ['symptoms', 'functionalLimitations', 'goals', 'relevantHistory', 'precautions'] as const) {
    const next = stringList(patchValue[key]);
    if (next !== undefined) patch[key] = next;
  }
  const painLevel = optionalNumber(patchValue.painLevel, 0, 10); if (painLevel !== undefined) patch.painLevel = painLevel;
  if (Object.keys(patch).length === 0) throw coreError('CORE_INPUT_INVALID', 'No se indicaron cambios para el expediente.');
  return { patient: ref(value.patient, 'patient'), patch };
}

export const universalPatientTools: ToolDefinition<any>[] = [
  {
    name: 'patient.create', version: 1, description: 'Crea un paciente con expediente inicial y, opcionalmente, un plan.',
    risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: [],
    validateInput: validatePatientCreate,
    preconditions(environment, input) {
      if (input.plan) {
        const exerciseIds = new Set(environment.state.exercises.map((item) => item.id));
        if (input.plan.exerciseIds.some((id: string) => !exerciseIds.has(id))) throw coreError('CORE_PRECONDITION_FAILED', 'El plan incluye un ejercicio inexistente.');
      }
    },
    execute(environment, input) {
      const patientId = `${environment.transactionId}-patient`;
      const recordId = `${environment.transactionId}-record`;
      let eventIndex = 0;
      const createEventId = () => `${environment.transactionId}-event-${eventIndex++}`;
      const created = applyCreatePatient(environment.state, {
        patientId,
        patient: {
          name: input.name,
          diagnosis: input.diagnosis,
          age: input.age,
          birthDate: input.birthDate,
          sex: input.sex,
          affectedArea: input.affectedArea,
          status: 'active',
          visitType: input.visitType,
          contact: structuredClone(input.contact),
        },
        now: environment.context.now,
        createEventId,
      });

      const affected: Array<{ type: 'patient' | 'clinical-record' | 'plan'; id: string }> = [{ type: 'patient', id: created.patient.id }];
      const summary = ['Paciente creado.', 'Expediente inicial creado.'];
      let planId: string | undefined;
      if (input.plan) {
        planId = `${environment.transactionId}-plan`;
        environment.state.plans.push({
          id: planId, patientId, title: input.plan.title, focus: input.plan.focus, duration: input.plan.duration,
          frequency: input.plan.frequency, goal: input.plan.goal, exerciseIds: [...new Set<string>(input.plan.exerciseIds as string[])],
          status: input.plan.status, progression: input.plan.progression, reportCriteria: input.plan.reportCriteria,
          generalInstructions: input.plan.generalInstructions, createdAt: environment.context.now, updatedAt: environment.context.now,
        });
        affected.push({ type: 'plan', id: planId });
        summary.push(`Plan creado como ${input.plan.status === 'active' ? 'activo' : 'borrador'}.`);
      }

      const recordResult = applyUpsertClinicalRecord(environment.state, {
        patientId,
        patch: {
          reasonForVisit: input.record.reasonForVisit,
          evolution: input.record.evolution,
          affectedArea: input.affectedArea,
          symptoms: input.record.symptoms,
          painLevel: input.record.painLevel,
          providedDiagnosis: input.record.providedDiagnosis,
          functionalLimitations: input.record.functionalLimitations,
          goals: input.record.goals,
          relevantHistory: input.record.relevantHistory,
          precautions: input.record.precautions,
          clinicalNotes: input.record.clinicalNotes,
          planId: planId ?? '',
        },
        recordId,
        versionId: `${environment.transactionId}-record-version`,
        now: environment.context.now,
        createEventId,
      });
      affected.splice(1, 0, { type: 'clinical-record', id: recordResult.record.id });

      return { status: 'success', message: `${input.name} quedó registrado.`, summary, data: { patientId, clinicalRecordId: recordResult.record.id, planId }, href: `/patients/${patientId}`, affected };
    },
  },
  {
    name: 'patient.update', version: 1, description: 'Actualiza datos demográficos o de contacto de un paciente.',
    risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: ['patient'],
    validateInput: validatePatientUpdate, preconditions() {},
    execute(environment, input) {
      const patientId = environment.resolved.patient?.id!;
      const updated = applyUpdatePatient(environment.state, {
        patientId,
        patch: input.patch,
        now: environment.context.now,
        createEventId: () => `${environment.transactionId}-event-0`,
      });
      return { status: 'success', message: `Actualicé los datos de ${updated.patient.name}.`, summary: ['Datos del paciente actualizados.'], data: { patientId: updated.patient.id }, href: `/patients/${updated.patient.id}`, affected: [{ type: 'patient', id: updated.patient.id }] };
    },
  },
  {
    name: 'patient.lifecycle', version: 1, description: 'Archiva o restaura un paciente.',
    risk: 'sensitive-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: ['patient'],
    validateInput(input) {
      const value = objectInput(input, 'La acción del paciente no es válida.');
      if (typeof value.archived !== 'boolean') throw coreError('CORE_INPUT_INVALID', 'Indica si el paciente debe archivarse o restaurarse.');
      return { patient: ref(value.patient, 'patient'), archived: value.archived };
    },
    preconditions() {},
    execute(environment, input) {
      const patientId = environment.resolved.patient?.id!;
      let eventIndex = 0;
      const lifecycle = applyPatientLifecycle(environment.state, {
        patientId,
        archived: input.archived,
        now: environment.context.now,
        createEventId: () => `${environment.transactionId}-event-${eventIndex++}`,
      });
      const affected: Array<{ type: 'patient' | 'plan'; id: string }> = [
        { type: 'patient', id: lifecycle.patient.id },
        ...lifecycle.pausedPlanIds.map((id) => ({ type: 'plan' as const, id })),
      ];
      return {
        status: 'success',
        message: `${lifecycle.patient.name} quedó ${input.archived ? 'archivado' : 'restaurado'}.`,
        summary: [
          `Paciente ${input.archived ? 'archivado' : 'restaurado'}.`,
          ...(lifecycle.pausedPlanIds.length ? [`${lifecycle.pausedPlanIds.length} plan${lifecycle.pausedPlanIds.length === 1 ? '' : 'es'} activo${lifecycle.pausedPlanIds.length === 1 ? '' : 's'} pausado${lifecycle.pausedPlanIds.length === 1 ? '' : 's'}.`] : []),
        ],
        data: { patientId: lifecycle.patient.id, pausedPlanIds: lifecycle.pausedPlanIds },
        href: `/patients/${lifecycle.patient.id}`,
        affected,
      };
    },
  },
  {
    name: 'patient_note.update', version: 1, description: 'Edita una nota existente del historial del paciente.',
    risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: ['patient'],
    validateInput(input) {
      const value = objectInput(input, 'La edición de la nota no es válida.');
      const noteId = text(value.noteId, 180) ?? '';
      const content = text(value.content, 10_000) ?? '';
      if (!noteId || !content) throw coreError('CORE_INPUT_INVALID', 'Selecciona la nota y escribe su contenido.');
      return { patient: ref(value.patient, 'patient'), noteId, content };
    },
    preconditions(environment, input) {
      const note = environment.state.notes.find((item) => item.id === input.noteId);
      if (!note || note.patientId !== environment.resolved.patient?.id) throw coreError('CORE_PRECONDITION_FAILED', 'La nota ya no existe o no pertenece al paciente.');
    },
    execute(environment, input) {
      const note = environment.state.notes.find((item) => item.id === input.noteId)!;
      note.content = input.content;
      note.updatedAt = environment.context.now;
      return { status: 'success', message: 'Nota actualizada.', summary: ['Nota clínica actualizada.'], data: { patientId: note.patientId, noteId: note.id }, href: `/patients/${note.patientId}`, affected: [{ type: 'patient', id: note.patientId }] };
    },
  },
  {
    name: 'clinical_record.upsert', version: 1, description: 'Crea o actualiza el expediente clínico canónico y conserva una versión anterior.',
    risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: ['patient'],
    validateInput: validateRecordUpsert,
    preconditions() {},
    execute(environment, input) {
      const patient = environment.resolved.patient!;
      const existed = environment.state.clinicalRecords.some((item) => item.patientId === patient.id);
      const result = applyUpsertClinicalRecord(environment.state, {
        patientId: patient.id,
        patch: input.patch,
        recordId: `${environment.transactionId}-record`,
        versionId: `${environment.transactionId}-record-version`,
        now: environment.context.now,
        createEventId: () => `${environment.transactionId}-event-0`,
      });
      return {
        status: 'success',
        message: existed ? 'Expediente clínico actualizado.' : 'Expediente clínico creado.',
        summary: [existed ? `Expediente actualizado a versión ${result.record.version}.` : 'Expediente clínico creado.'],
        data: { patientId: patient.id, clinicalRecordId: result.record.id },
        href: `/patients/${patient.id}/clinical-record`,
        affected: [{ type: 'clinical-record', id: result.record.id }],
      };
    },
  },
];