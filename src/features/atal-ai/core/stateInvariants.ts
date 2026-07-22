import type { AtalState } from '@/src/data/atalStore';
import { coreError } from './contracts';
import { stableSerialize } from './stableValue';

const PLAN_STATUSES = new Set(['draft', 'active', 'paused', 'completed', 'archived']);
const EXERCISE_STATUSES = new Set(['active', 'archived']);

function fail(message: string): never {
  throw coreError('CORE_INVARIANT_FAILED', message);
}

function assertArray(value: unknown, name: string): asserts value is unknown[] {
  if (!Array.isArray(value)) fail(`La colección ${name} no es válida.`);
  if (value.some((item) => item === undefined)) fail(`La colección ${name} contiene una entrada inválida.`);
}

function assertUniqueIds(collection: Array<{ id: string }>, name: string): void {
  const ids = new Set<string>();
  for (const entity of collection) {
    if (!entity || typeof entity.id !== 'string' || !entity.id.trim()) fail(`La colección ${name} contiene un ID vacío.`);
    if (ids.has(entity.id)) fail(`La colección ${name} contiene IDs duplicados.`);
    ids.add(entity.id);
  }
}

function assertIso(value: string, label: string): void {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) fail(`${label} debe ser una fecha ISO válida.`);
}

function validateRecordUpdates(candidate: AtalState, previous: AtalState): void {
  const previousById = new Map(previous.clinicalRecords.map((record) => [record.id, record]));
  const previousVersionIds = new Set(previous.clinicalRecordVersions.map((version) => version.id));

  for (const record of candidate.clinicalRecords) {
    const before = previousById.get(record.id);
    if (!before) {
      if (record.version !== 1) fail('Un expediente nuevo debe comenzar en versión 1.');
      continue;
    }
    if (record.createdAt !== before.createdAt) fail('Una actualización de expediente debe preservar createdAt.');
    if (stableSerialize(record) === stableSerialize(before)) continue;
    if (record.version !== before.version + 1) fail('La versión del expediente debe incrementarse exactamente una vez.');
    const snapshots = candidate.clinicalRecordVersions.filter((version) =>
      !previousVersionIds.has(version.id)
      && version.recordId === before.id
      && version.version === before.version
      && stableSerialize(version.snapshot) === stableSerialize(before));
    if (snapshots.length !== 1) fail('La actualización del expediente requiere exactamente un snapshot previo.');
  }
}

export function validateAtalStateInvariants(candidate: AtalState, previous?: AtalState): void {
  if (candidate.version !== 2) fail('La versión del store debe permanecer en 2.');

  const collectionNames = [
    'patients',
    'plans',
    'exercises',
    'clinicalRecords',
    'clinicalRecordVersions',
    'sessions',
    'notes',
    'events',
    'notifications',
    'feedback',
  ] as const;
  for (const name of collectionNames) assertArray(candidate[name], name);

  for (const name of collectionNames) {
    assertUniqueIds(candidate[name] as Array<{ id: string }>, name);
  }

  const patientIds = new Set(candidate.patients.map((patient) => patient.id));
  const planById = new Map(candidate.plans.map((plan) => [plan.id, plan]));
  const exerciseIds = new Set(candidate.exercises.map((exercise) => exercise.id));
  const recordIds = new Set(candidate.clinicalRecords.map((record) => record.id));

  for (const patient of candidate.patients) {
    assertIso(patient.createdAt, 'patient.createdAt');
    assertIso(patient.updatedAt, 'patient.updatedAt');
  }

  const activeByPatient = new Map<string, number>();
  for (const plan of candidate.plans) {
    if (!patientIds.has(plan.patientId)) fail('Un plan referencia un paciente inexistente.');
    if (!PLAN_STATUSES.has(plan.status)) fail('Un plan contiene un estado inválido.');
    if (plan.exerciseIds.some((id) => !exerciseIds.has(id))) fail('Un plan referencia un ejercicio inexistente.');
    if (plan.status === 'active' && plan.exerciseIds.length === 0) fail('Un plan activo requiere al menos un ejercicio.');
    if (plan.status === 'active') activeByPatient.set(plan.patientId, (activeByPatient.get(plan.patientId) ?? 0) + 1);
    assertIso(plan.createdAt, 'plan.createdAt');
    assertIso(plan.updatedAt, 'plan.updatedAt');
  }
  if ([...activeByPatient.values()].some((count) => count > 1)) fail('Un paciente no puede tener más de un plan activo.');

  for (const exercise of candidate.exercises) {
    if (!EXERCISE_STATUSES.has(exercise.status)) fail('Un ejercicio contiene un estado inválido.');
    if (!Number.isInteger(exercise.sets) || exercise.sets < 1) fail('Las series de un ejercicio deben ser al menos 1.');
    if (exercise.maxPain !== null && (!Number.isFinite(exercise.maxPain) || exercise.maxPain < 0 || exercise.maxPain > 10)) {
      fail('El dolor máximo debe estar entre 0 y 10.');
    }
    assertIso(exercise.createdAt, 'exercise.createdAt');
    assertIso(exercise.updatedAt, 'exercise.updatedAt');
  }

  for (const record of candidate.clinicalRecords) {
    if (!patientIds.has(record.patientId)) fail('Un expediente referencia un paciente inexistente.');
    if (record.planId) {
      const plan = planById.get(record.planId);
      if (!plan || plan.patientId !== record.patientId) fail('El plan del expediente no pertenece al mismo paciente.');
    }
    if (!Number.isInteger(record.version) || record.version < 1) fail('La versión del expediente no es válida.');
    if (record.painLevel !== null && (!Number.isFinite(record.painLevel) || record.painLevel < 0 || record.painLevel > 10)) {
      fail('El dolor del expediente debe estar entre 0 y 10.');
    }
    assertIso(record.createdAt, 'clinicalRecord.createdAt');
    assertIso(record.updatedAt, 'clinicalRecord.updatedAt');
  }

  for (const version of candidate.clinicalRecordVersions) {
    if (!recordIds.has(version.recordId)) fail('Una versión referencia un expediente inexistente.');
    if (!patientIds.has(version.patientId)) fail('Una versión referencia un paciente inexistente.');
    assertIso(version.createdAt, 'clinicalRecordVersion.createdAt');
  }

  for (const session of candidate.sessions) {
    const plan = planById.get(session.planId);
    if (!patientIds.has(session.patientId) || !plan) fail('Una sesión contiene relaciones inexistentes.');
    if (plan.patientId !== session.patientId) fail('El plan de la sesión no pertenece al mismo paciente.');
    for (const pain of [session.startPain, session.endPain]) {
      if (!Number.isFinite(pain) || pain < 0 || pain > 10) fail('El dolor de una sesión debe estar entre 0 y 10.');
    }
    assertIso(session.startedAt, 'session.startedAt');
    assertIso(session.completedAt, 'session.completedAt');
    assertIso(session.createdAt, 'session.createdAt');
    assertIso(session.updatedAt, 'session.updatedAt');
  }

  for (const note of candidate.notes) {
    if (!patientIds.has(note.patientId)) fail('Una nota referencia un paciente inexistente.');
    assertIso(note.createdAt, 'note.createdAt');
    assertIso(note.updatedAt, 'note.updatedAt');
  }

  if (previous) {
    for (const name of ['patients', 'plans', 'exercises'] as const) {
      const beforeById = new Map(previous[name].map((entity) => [entity.id, entity]));
      for (const entity of candidate[name]) {
        const before = beforeById.get(entity.id);
        if (before && entity.createdAt !== before.createdAt) fail(`Una actualización en ${name} debe preservar createdAt.`);
      }
    }
    validateRecordUpdates(candidate, previous);
  }
}
