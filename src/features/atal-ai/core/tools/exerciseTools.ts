import { applyCreateExercise, applyUpdateExercise, type ExerciseActionDraft, type ExerciseActionPatch } from '../../../../domain/actions/exerciseActions';
import type { AtalAIDraft, AIExerciseDraft, PrivateContactDraft } from '../../types';
import { coreError, type AffectedEntity, type ToolDefinition, type ToolExecutionEnvironment } from '../contracts';
import { normalizeEntityLabel } from '../stableValue';

export type DraftToolInput = {
  draft: AtalAIDraft;
  privateContact: PrivateContactDraft;
  force: boolean;
};

export function validateDraftInput(input: unknown, expectedIntent: AtalAIDraft['intent']): DraftToolInput {
  if (!input || typeof input !== 'object') throw coreError('CORE_INPUT_INVALID', 'El borrador no es válido.');
  const value = input as Partial<DraftToolInput>;
  if (!value.draft || value.draft.intent !== expectedIntent) throw coreError('CORE_INPUT_INVALID', 'El borrador no corresponde con la acción registrada.');
  if (value.draft.contradictions.length) throw coreError('CORE_INPUT_INVALID', 'Resuelve las contradicciones clínicas antes de aplicar el borrador.');
  return {
    draft: value.draft,
    privateContact: value.privateContact ?? { phone: '', email: '', address: '', emergencyContact: '' },
    force: value.force === true,
  };
}

function numberFromText(value: string): number | undefined {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function exerciseDraft(draft: AIExerciseDraft): ExerciseActionDraft {
  if (!draft.name.trim()) throw coreError('CORE_INPUT_INVALID', 'El ejercicio requiere un nombre.');
  if (draft.sets === null || !Number.isInteger(draft.sets) || draft.sets < 1) throw coreError('CORE_INPUT_INVALID', `Completa las series de “${draft.name}”.`);
  const repetitions = numberFromText(draft.repetitions);
  return {
    name: draft.name,
    region: draft.region.trim() || 'Personalizada',
    category: draft.category.trim() || 'Personalizado',
    objective: draft.objective,
    startingPosition: draft.startingPosition,
    instructions: draft.instructions,
    precautions: draft.precautions.join('\n'),
    equipment: draft.equipment,
    difficulty: draft.difficulty,
    sets: draft.sets,
    repetitions,
    time: repetitions ? undefined : draft.duration || undefined,
    rest: draft.rest,
    maxPain: draft.maxPain,
    tags: draft.tags,
    notes: draft.notes,
    media: { type: 'none' },
  };
}

export function materializeExercises(
  environment: ToolExecutionEnvironment,
  drafts: AIExerciseDraft[],
): { exerciseIds: string[]; affected: AffectedEntity[]; summary: string[]; firstCreatedId?: string } {
  const exerciseIds: string[] = [];
  const affected: AffectedEntity[] = [];
  const summary: string[] = [];
  let firstCreatedId: string | undefined;
  let eventIndex = 0;

  for (const [index, draft] of drafts.filter((item) => item.name.trim()).entries()) {
    const source = draft.sourceExerciseId
      ? environment.state.exercises.find((item) => item.id === draft.sourceExerciseId && item.status === 'active')
      : undefined;
    if (draft.sourceExerciseId && !source) throw coreError('CORE_PRECONDITION_FAILED', `El ejercicio de origen “${draft.name}” ya no existe.`);
    const exactMatches = environment.state.exercises.filter((item) =>
      item.status === 'active'
      && normalizeEntityLabel(item.name) === normalizeEntityLabel(draft.name)
      && (!draft.region.trim() || normalizeEntityLabel(item.region) === normalizeEntityLabel(draft.region)));
    const exact = source ?? (exactMatches.length === 1 ? exactMatches[0] : undefined);
    if (!source && exactMatches.length > 1 && draft.reusePreference === 'reuse-exact') {
      throw coreError('CORE_ENTITY_AMBIGUOUS', `Hay varios ejercicios llamados “${draft.name}”.`);
    }
    if (exact && draft.reusePreference === 'reuse-exact') {
      if (!exerciseIds.includes(exact.id)) exerciseIds.push(exact.id);
      summary.push(`Ejercicio reutilizado: ${exact.name}.`);
      continue;
    }
    const created = applyCreateExercise(environment.state, {
      exerciseId: `${environment.transactionId}-exercise-${index + 1}`,
      exercise: exerciseDraft(draft),
      now: environment.context.now,
      createEventId: () => `${environment.transactionId}-exercise-event-${eventIndex++}`,
    }).exercise;
    exerciseIds.push(created.id);
    affected.push({ type: 'exercise', id: created.id });
    firstCreatedId ??= created.id;
    summary.push(`Ejercicio nuevo creado: ${created.name}.`);
  }
  return { exerciseIds, affected, summary, firstCreatedId };
}

export const exerciseTools: ToolDefinition[] = [
  {
    name: 'exercise.create', version: 1, risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000,
    requiredEntities: [],
    validateInput: (input) => validateDraftInput(input, 'create_exercise'),
    preconditions() {},
    execute(environment, input) {
      const { draft } = input as DraftToolInput;
      const created = materializeExercises(environment, draft.exercises);
      if (!created.exerciseIds.length) throw coreError('CORE_INPUT_INVALID', 'Añade al menos un ejercicio.');
      return {
        status: 'success', message: created.summary.join(' '), summary: created.summary,
        data: { exerciseId: created.firstCreatedId ?? created.exerciseIds[0], exerciseIds: created.exerciseIds },
        href: created.firstCreatedId ? `/exercises/${created.firstCreatedId}` : '/exercises',
        affected: created.affected,
      };
    },
  },
  {
    name: 'exercise.update', version: 1, risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000,
    requiredEntities: ['exercise'],
    validateInput: (input) => validateDraftInput(input, 'update_existing_exercise'),
    preconditions(environment, input) {
      if (!environment.state.exercises.some((item) => item.id === environment.resolved.exercise?.id)) throw coreError('CORE_PRECONDITION_FAILED', 'El ejercicio ya no existe.');
      const next = (input as DraftToolInput).draft.exercises[0];
      if (!next?.name.trim() || next.sets === null || next.sets < 1) throw coreError('CORE_INPUT_INVALID', 'El borrador no contiene un ejercicio válido.');
    },
    execute(environment, input) {
      const next = (input as DraftToolInput).draft.exercises[0];
      const patch: ExerciseActionPatch = { name: next.name, sets: next.sets! };
      const repetitions = numberFromText(next.repetitions);
      if (next.region.trim()) patch.region = next.region;
      if (next.category.trim()) patch.category = next.category;
      if (next.objective.trim()) patch.objective = next.objective;
      if (next.startingPosition.trim()) patch.startingPosition = next.startingPosition;
      if (next.instructions.length) patch.instructions = next.instructions;
      if (next.precautions.length) patch.precautions = next.precautions.join('\n');
      if (next.equipment.trim()) patch.equipment = next.equipment;
      if (next.difficulty.trim()) patch.difficulty = next.difficulty;
      if (repetitions !== undefined) {
        patch.repetitions = repetitions;
        patch.time = '';
      } else if (next.duration.trim()) {
        patch.time = next.duration;
      }
      if (next.rest.trim()) patch.rest = next.rest;
      if (next.maxPain !== null) patch.maxPain = next.maxPain;
      if (next.tags.length) patch.tags = next.tags;
      if (next.notes.trim()) patch.notes = next.notes;

      const exercise = applyUpdateExercise(environment.state, {
        exerciseId: environment.resolved.exercise!.id,
        patch,
        now: environment.context.now,
      }).exercise;
      return {
        status: 'success', message: `Ejercicio actualizado: ${exercise.name}.`, summary: [`Ejercicio actualizado: ${exercise.name}.`],
        data: { exerciseId: exercise.id }, href: `/exercises/${exercise.id}`, affected: [{ type: 'exercise', id: exercise.id }],
      };
    },
  },
];