import { applyCreateExercise, applyDuplicateExercise, applyExerciseLifecycle, applyUpdateExercise } from '../../../../domain/actions/exerciseActions';
import type { ToolDefinition } from '../contracts';
import { universalPlanExerciseTools } from './universalPlanExerciseTools';

const sourceByName = new Map(universalPlanExerciseTools.map((tool) => [tool.name, tool]));

function source(name: string) {
  const tool = sourceByName.get(name);
  if (!tool) throw new Error(`Missing source tool ${name}`);
  return tool;
}

const createSource = source('exercise.create_simple');
const updateSource = source('exercise.update_fields');
const duplicateSource = source('exercise.duplicate');
const lifecycleSource = source('exercise.lifecycle');

const createTool: ToolDefinition<any> = {
  ...createSource,
  execute(environment, input) {
    let eventIndex = 0;
    const result = applyCreateExercise(environment.state, {
      exerciseId: `${environment.transactionId}-exercise`,
      exercise: input,
      now: environment.context.now,
      createEventId: () => `${environment.transactionId}-exercise-event-${eventIndex++}`,
    });
    return {
      status: 'success',
      message: `Ejercicio “${result.exercise.name}” creado.`,
      summary: ['Ejercicio creado.'],
      data: { exerciseId: result.exercise.id },
      href: `/exercises/${result.exercise.id}`,
      affected: [{ type: 'exercise', id: result.exercise.id }],
    };
  },
};

const updateTool: ToolDefinition<any> = {
  ...updateSource,
  execute(environment, input) {
    const result = applyUpdateExercise(environment.state, {
      exerciseId: environment.resolved.exercise!.id,
      patch: input.patch,
      now: environment.context.now,
    });
    return {
      status: 'success',
      message: `Ejercicio “${result.exercise.name}” actualizado.`,
      summary: ['Ejercicio actualizado.'],
      data: { exerciseId: result.exercise.id },
      href: `/exercises/${result.exercise.id}`,
      affected: [{ type: 'exercise', id: result.exercise.id }],
    };
  },
};

const duplicateTool: ToolDefinition<any> = {
  ...duplicateSource,
  execute(environment, input) {
    let eventIndex = 0;
    const result = applyDuplicateExercise(environment.state, {
      exerciseId: environment.resolved.exercise!.id,
      duplicateId: `${environment.transactionId}-exercise`,
      now: environment.context.now,
      createEventId: () => `${environment.transactionId}-exercise-event-${eventIndex++}`,
    });
    const exercise = input.name
      ? applyUpdateExercise(environment.state, {
          exerciseId: result.exercise.id,
          patch: { name: input.name },
          now: environment.context.now,
        }).exercise
      : result.exercise;
    return {
      status: 'success',
      message: `Ejercicio “${exercise.name}” duplicado.`,
      summary: ['Ejercicio duplicado.'],
      data: { exerciseId: exercise.id },
      href: `/exercises/${exercise.id}`,
      affected: [{ type: 'exercise', id: exercise.id }],
    };
  },
};

const lifecycleTool: ToolDefinition<any> = {
  ...lifecycleSource,
  execute(environment, input) {
    const result = applyExerciseLifecycle(environment.state, {
      exerciseId: environment.resolved.exercise!.id,
      archived: input.archived,
      now: environment.context.now,
    });
    return {
      status: 'success',
      message: `Ejercicio ${input.archived ? 'archivado' : 'restaurado'}.`,
      summary: [`Ejercicio ${input.archived ? 'archivado' : 'restaurado'}.`],
      data: { exerciseId: result.exercise.id },
      href: `/exercises/${result.exercise.id}`,
      affected: [{ type: 'exercise', id: result.exercise.id }],
    };
  },
};

export const canonicalUniversalExerciseTools: ToolDefinition<any>[] = [createTool, updateTool, duplicateTool, lifecycleTool];
export const canonicalUniversalExerciseToolNames = new Set(canonicalUniversalExerciseTools.map((tool) => tool.name));
