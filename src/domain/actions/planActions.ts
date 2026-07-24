import type { AtalState, PlanEntity } from '../../data/atalStore';
import { syncClinicalRecordPlanAssociation } from '../planAssociation';
import { actionError } from './contracts';

const TEXT_FIELDS = [
  'title',
  'focus',
  'duration',
  'frequency',
  'goal',
  'progression',
  'reportCriteria',
  'generalInstructions',
] as const;

type PlanTextField = (typeof TEXT_FIELDS)[number];

export type PlanCreateData = Omit<PlanEntity, 'id' | 'patientId' | 'createdAt' | 'updatedAt'>;
export type PlanUpdatePatch = Partial<Pick<PlanEntity, PlanTextField | 'exerciseIds'>>;
export type PlanMembershipOperation = 'add' | 'remove' | 'reorder';

export type PlanCreateActionInput = {
  patientId: string;
  planId: string;
  plan: PlanCreateData;
  now: string;
  createEventId: () => string;
};

export type PlanUpdateActionInput = {
  planId: string;
  patch: PlanUpdatePatch;
  now: string;
  createEventId: () => string;
};

export type PlanMembershipActionInput = {
  planId: string;
  operation: PlanMembershipOperation;
  exerciseIds: string[];
  now: string;
  createEventId: () => string;
};

function uniqueExerciseIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function ensurePatientExists(state: AtalState, patientId: string) {
  if (!state.patients.some((patient) => patient.id === patientId)) {
    throw actionError('CORE_ENTITY_NOT_FOUND', 'Paciente no encontrado.');
  }
}

function ensureExercisesExist(state: AtalState, ids: string[]) {
  const existing = new Set(state.exercises.map((exercise) => exercise.id));
  if (ids.some((id) => !existing.has(id))) {
    throw actionError('CORE_PRECONDITION_FAILED', 'El plan incluye un ejercicio inexistente.');
  }
}

function ensureActivePlanHasExercises(status: PlanEntity['status'], ids: string[]) {
  if (status === 'active' && ids.length === 0) {
    throw actionError('CORE_PRECONDITION_FAILED', 'Un plan activo necesita al menos un ejercicio.');
  }
}

function ensureNoOtherActivePlan(state: AtalState, patientId: string, exceptPlanId?: string) {
  const conflict = state.plans.find((plan) => plan.patientId === patientId && plan.status === 'active' && plan.id !== exceptPlanId);
  if (conflict) {
    throw actionError('CORE_PRECONDITION_FAILED', 'El paciente ya tiene un plan activo. Usa reemplazar plan activo.');
  }
}

function normalizedTextPatch(plan: PlanEntity, patch: PlanUpdatePatch) {
  const next: PlanUpdatePatch = {};
  for (const key of TEXT_FIELDS) {
    if (patch[key] === undefined) continue;
    const value = patch[key]!.trim();
    if (key === 'title' && !value) throw actionError('CORE_INPUT_INVALID', 'El título del plan no puede quedar vacío.');
    next[key] = value;
  }
  if (patch.exerciseIds !== undefined) next.exerciseIds = uniqueExerciseIds(patch.exerciseIds);
  return next;
}

export function applyCreatePlan(state: AtalState, input: PlanCreateActionInput) {
  ensurePatientExists(state, input.patientId);
  if (state.plans.some((plan) => plan.id === input.planId)) {
    throw actionError('CORE_PRECONDITION_FAILED', 'Ya existe un plan con ese identificador.');
  }

  const title = input.plan.title.trim();
  if (!title) throw actionError('CORE_INPUT_INVALID', 'Añade un título al plan.');

  const exerciseIds = uniqueExerciseIds(input.plan.exerciseIds);
  ensureExercisesExist(state, exerciseIds);
  ensureActivePlanHasExercises(input.plan.status, exerciseIds);
  if (input.plan.status === 'active') ensureNoOtherActivePlan(state, input.patientId);

  const plan: PlanEntity = {
    ...structuredClone(input.plan),
    id: input.planId,
    patientId: input.patientId,
    title,
    focus: input.plan.focus.trim(),
    duration: input.plan.duration.trim(),
    frequency: input.plan.frequency.trim(),
    goal: input.plan.goal.trim(),
    exerciseIds,
    progression: input.plan.progression.trim(),
    reportCriteria: input.plan.reportCriteria.trim(),
    generalInstructions: input.plan.generalInstructions.trim(),
    createdAt: input.now,
    updatedAt: input.now,
  };

  const eventId = input.createEventId();
  state.plans.push(plan);
  syncClinicalRecordPlanAssociation(state, plan.patientId, plan.id, input.now);
  state.events.unshift({
    id: eventId,
    kind: 'plan_created',
    patientId: plan.patientId,
    planId: plan.id,
    title: 'Plan creado',
    detail: plan.title,
    createdAt: input.now,
  });

  return { plan, eventId };
}

export function applyUpdatePlan(state: AtalState, input: PlanUpdateActionInput) {
  const plan = state.plans.find((item) => item.id === input.planId);
  if (!plan) throw actionError('CORE_ENTITY_NOT_FOUND', 'Plan no encontrado.');

  const patch = normalizedTextPatch(plan, input.patch);
  const nextExerciseIds = patch.exerciseIds ?? plan.exerciseIds;
  ensureExercisesExist(state, nextExerciseIds);
  if (plan.status === 'active' && nextExerciseIds.length === 0) {
    throw actionError('CORE_PRECONDITION_FAILED', 'Un plan activo no puede quedarse sin ejercicios.');
  }

  const immutableId = plan.id;
  const immutablePatientId = plan.patientId;
  const immutableCreatedAt = plan.createdAt;
  Object.assign(plan, patch, {
    id: immutableId,
    patientId: immutablePatientId,
    createdAt: immutableCreatedAt,
    updatedAt: input.now,
  });

  syncClinicalRecordPlanAssociation(state, plan.patientId, plan.id, input.now);
  const eventId = input.createEventId();
  state.events.unshift({
    id: eventId,
    kind: 'plan_updated',
    patientId: plan.patientId,
    planId: plan.id,
    title: 'Plan actualizado',
    detail: plan.title,
    createdAt: input.now,
  });

  return { plan, eventId };
}

export function applyPlanMembership(state: AtalState, input: PlanMembershipActionInput) {
  const plan = state.plans.find((item) => item.id === input.planId);
  if (!plan) throw actionError('CORE_ENTITY_NOT_FOUND', 'Plan no encontrado.');

  const requested = uniqueExerciseIds(input.exerciseIds);
  if (requested.length === 0) throw actionError('CORE_INPUT_INVALID', 'Indica al menos un ejercicio.');
  ensureExercisesExist(state, requested);

  let nextExerciseIds: string[];
  if (input.operation === 'add') {
    nextExerciseIds = uniqueExerciseIds([...plan.exerciseIds, ...requested]);
  } else if (input.operation === 'remove') {
    nextExerciseIds = plan.exerciseIds.filter((id) => !requested.includes(id));
  } else if (input.operation === 'reorder') {
    const sameMembership = requested.length === plan.exerciseIds.length
      && requested.every((id) => plan.exerciseIds.includes(id));
    if (!sameMembership) {
      throw actionError('CORE_PRECONDITION_FAILED', 'El nuevo orden debe contener exactamente los ejercicios actuales.');
    }
    nextExerciseIds = [...requested];
  } else {
    throw actionError('CORE_INPUT_INVALID', 'Selecciona añadir, retirar o reordenar.');
  }

  if (plan.status === 'active' && nextExerciseIds.length === 0) {
    throw actionError('CORE_PRECONDITION_FAILED', 'Un plan activo no puede quedarse sin ejercicios.');
  }

  plan.exerciseIds = nextExerciseIds;
  plan.updatedAt = input.now;
  syncClinicalRecordPlanAssociation(state, plan.patientId, plan.id, input.now);
  const eventId = input.createEventId();
  state.events.unshift({
    id: eventId,
    kind: 'plan_updated',
    patientId: plan.patientId,
    planId: plan.id,
    title: 'Plan actualizado',
    detail: plan.title,
    createdAt: input.now,
  });

  return { plan, eventId };
}
