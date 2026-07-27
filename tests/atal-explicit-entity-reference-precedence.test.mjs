import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, exercise, memoryPort, validState } from './helpers/core-fixtures.mjs';

const engineModule = () => loadCore('src/features/atal-ai/core/executionEngine.js');

function invocation(tool, input, references = []) {
  return { tool, version: 1, input, references, proposalId: `proposal-${tool}` };
}

test('an explicit exercise label overrides a different ambient selected exercise', () => {
  const state = validState();
  state.exercises[0] = exercise('exercise-mobility', 'Movilidad asistida E2E');
  state.exercises.push(exercise('exercise-strength', 'Rotación externa Flujo QA'));
  const port = memoryPort(state);
  const { executeToolInvocation } = engineModule();

  const result = executeToolInvocation({
    invocation: invocation(
      'app.read',
      { resource: 'exercise', exercise: { type: 'exercise', label: 'Movilidad asistida E2E' } },
      [{ type: 'exercise', label: 'Movilidad asistida E2E' }],
    ),
    context: context({ selectedExerciseId: 'exercise-strength' }),
  }, { port });

  assert.equal(result.status, 'success');
  assert.equal(result.data.exercise.id, 'exercise-mobility');
  assert.equal(result.data.exercise.name, 'Movilidad asistida E2E');
  assert.match(result.message, /Movilidad asistida E2E/);
});
