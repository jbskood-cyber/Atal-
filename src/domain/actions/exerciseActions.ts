import type { AtalState, ExerciseEntity, ExerciseMediaRef } from '../../data/atalStore';
import { actionError } from './contracts';

export type ExerciseActionDraft = Omit<ExerciseEntity, 'id' | 'status' | 'source' | 'createdAt' | 'updatedAt'>;
export type ExerciseActionPatch = Partial<Omit<ExerciseEntity, 'id' | 'status' | 'source' | 'createdAt' | 'updatedAt' | 'media'>>;

type EventIdFactory = () => string;

function requiredText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw actionError('CORE_INPUT_INVALID', `${label} es obligatorio.`);
  return normalized;
}

function optionalText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : value.trim();
}

function normalizeList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function validatePrescription(input: { sets: number; repetitions?: number; maxPain: number | null }): void {
  if (!Number.isInteger(input.sets) || input.sets < 1) {
    throw actionError('CORE_INPUT_INVALID', 'Las series deben ser al menos 1.');
  }
  if (input.repetitions !== undefined && (!Number.isInteger(input.repetitions) || input.repetitions < 1)) {
    throw actionError('CORE_INPUT_INVALID', 'Las repeticiones deben ser un entero de al menos 1.');
  }
  if (input.maxPain !== null && (!Number.isFinite(input.maxPain) || input.maxPain < 0 || input.maxPain > 10)) {
    throw actionError('CORE_INPUT_INVALID', 'El dolor máximo debe estar entre 0 y 10.');
  }
}

function findExercise(state: AtalState, exerciseId: string): ExerciseEntity {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) throw actionError('CORE_PRECONDITION_FAILED', 'El ejercicio ya no existe.');
  return exercise;
}

function assertAvailableId(state: AtalState, exerciseId: string): void {
  if (state.exercises.some((item) => item.id === exerciseId)) {
    throw actionError('CORE_PRECONDITION_FAILED', 'El ID del ejercicio ya existe.');
  }
}

function normalizeDraft(exercise: ExerciseActionDraft): ExerciseActionDraft {
  validatePrescription(exercise);
  return {
    ...exercise,
    name: requiredText(exercise.name, 'El nombre del ejercicio'),
    region: exercise.region.trim(),
    category: exercise.category.trim(),
    objective: exercise.objective.trim(),
    startingPosition: exercise.startingPosition.trim(),
    instructions: normalizeList(exercise.instructions),
    precautions: exercise.precautions.trim(),
    equipment: exercise.equipment.trim(),
    difficulty: exercise.difficulty.trim(),
    time: optionalText(exercise.time),
    rest: exercise.rest.trim(),
    tags: normalizeList(exercise.tags),
    notes: exercise.notes.trim(),
    media: structuredClone(exercise.media satisfies ExerciseMediaRef),
  };
}

function normalizePatch(current: ExerciseEntity, patch: ExerciseActionPatch): ExerciseActionPatch {
  const normalized: ExerciseActionPatch = {};
  for (const key of ['name', 'region', 'category', 'objective', 'startingPosition', 'precautions', 'equipment', 'difficulty', 'time', 'rest', 'notes'] as const) {
    if (patch[key] === undefined) continue;
    const value = patch[key] as string;
    normalized[key] = key === 'name' ? requiredText(value, 'El nombre del ejercicio') : value.trim();
  }
  if (patch.instructions !== undefined) normalized.instructions = normalizeList(patch.instructions);
  if (patch.tags !== undefined) normalized.tags = normalizeList(patch.tags);
  if (patch.sets !== undefined) normalized.sets = patch.sets;
  if (patch.repetitions !== undefined) normalized.repetitions = patch.repetitions;
  if (patch.maxPain !== undefined) normalized.maxPain = patch.maxPain;
  validatePrescription({
    sets: normalized.sets ?? current.sets,
    repetitions: normalized.repetitions ?? current.repetitions,
    maxPain: normalized.maxPain !== undefined ? normalized.maxPain : current.maxPain,
  });
  return normalized;
}

export function applyCreateExercise(state: AtalState, input: {
  exerciseId: string;
  exercise: ExerciseActionDraft;
  now: string;
  createEventId: EventIdFactory;
}): { exercise: ExerciseEntity } {
  assertAvailableId(state, input.exerciseId);
  const normalized = normalizeDraft(input.exercise);
  const exercise: ExerciseEntity = {
    ...normalized,
    id: input.exerciseId,
    status: 'active',
    source: 'local',
    createdAt: input.now,
    updatedAt: input.now,
  };
  state.exercises.push(exercise);
  state.events.unshift({
    id: input.createEventId(),
    kind: 'exercise_created',
    title: 'Ejercicio creado',
    detail: exercise.name,
    createdAt: input.now,
  });
  return { exercise };
}

export function applyUpdateExercise(state: AtalState, input: {
  exerciseId: string;
  patch: ExerciseActionPatch;
  now: string;
}): { exercise: ExerciseEntity } {
  const current = findExercise(state, input.exerciseId);
  const patch = normalizePatch(current, input.patch);
  const next: ExerciseEntity = {
    ...current,
    ...patch,
    id: current.id,
    source: current.source,
    media: current.media,
    status: current.status,
    createdAt: current.createdAt,
    updatedAt: input.now,
  };
  const index = state.exercises.findIndex((item) => item.id === current.id);
  state.exercises[index] = next;
  return { exercise: next };
}

export function applyDuplicateExercise(state: AtalState, input: {
  exerciseId: string;
  duplicateId: string;
  now: string;
  name?: string;
  createEventId: EventIdFactory;
}): { exercise: ExerciseEntity } {
  const source = findExercise(state, input.exerciseId);
  assertAvailableId(state, input.duplicateId);
  const exercise: ExerciseEntity = {
    ...structuredClone(source),
    id: input.duplicateId,
    name: input.name === undefined ? `${source.name} — copia` : requiredText(input.name, 'El nombre del ejercicio'),
    media: structuredClone(source.media),
    status: 'active',
    source: 'local',
    createdAt: input.now,
    updatedAt: input.now,
  };
  state.exercises.push(exercise);
  state.events.unshift({
    id: input.createEventId(),
    kind: 'exercise_created',
    title: 'Ejercicio creado',
    detail: exercise.name,
    createdAt: input.now,
  });
  return { exercise };
}

export function applyExerciseLifecycle(state: AtalState, input: {
  exerciseId: string;
  archived: boolean;
  now: string;
}): { exercise: ExerciseEntity } {
  const current = findExercise(state, input.exerciseId);
  const next: ExerciseEntity = {
    ...current,
    id: current.id,
    source: current.source,
    media: current.media,
    createdAt: current.createdAt,
    status: input.archived ? 'archived' : 'active',
    updatedAt: input.now,
  };
  const index = state.exercises.findIndex((item) => item.id === current.id);
  state.exercises[index] = next;
  return { exercise: next };
}
