import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const grounding = () => loadCore('src/features/atal-ai/core/agentic/planMembershipGrounding.js');

function readStep(exerciseId = 'exercise-e2e', name = 'Movilidad asistida E2E') {
  return {
    callId: 'read-exercise',
    invocation: {
      tool: 'app.read', version: 1, proposalId: 'read-exercise', references: [],
      input: { resource: 'exercises', query: name },
    },
    result: {
      status: 'success',
      message: `Encontré 1 ejercicios: ${name}.`,
      summary: [name],
      data: { exercises: [{ id: exerciseId, name }] },
      affected: [],
    },
  };
}

function removeCall(exerciseIds) {
  return {
    id: 'remove-membership',
    bridge: 'atal_action',
    functionName: 'atal_plan_membership',
    tool: 'plan.membership',
    input: {
      plan: { type: 'plan', id: 'plan-active-e2e' },
      operation: 'remove',
      exerciseIds,
    },
    references: [{ type: 'plan', id: 'plan-active-e2e' }],
  };
}

test('grounds a singular natural exercise removal to the exact exercise resolved earlier in the same turn', () => {
  const { groundPlanMembershipCall } = grounding();
  const call = removeCall(['exercise-control-live', 'exercise-rotation-live']);
  const grounded = groundPlanMembershipCall(
    'Quítale al plan el ejercicio Movilidad asistida E2E.',
    [readStep()],
    call,
  );

  assert.deepEqual(grounded.input.exerciseIds, ['exercise-e2e']);
  assert.equal(grounded.input.operation, 'remove');
});

test('keeps an already-correct removal target unchanged', () => {
  const { groundPlanMembershipCall } = grounding();
  const call = removeCall(['exercise-e2e']);
  const grounded = groundPlanMembershipCall(
    'Quita del plan el ejercicio Movilidad asistida E2E.',
    [readStep()],
    call,
  );
  assert.deepEqual(grounded.input.exerciseIds, ['exercise-e2e']);
});

test('does not rewrite plural removals or calls without grounded read evidence', () => {
  const { groundPlanMembershipCall } = grounding();
  const call = removeCall(['exercise-control-live', 'exercise-rotation-live']);

  assert.deepEqual(
    groundPlanMembershipCall('Quita del plan los ejercicios de movilidad.', [readStep()], call).input.exerciseIds,
    ['exercise-control-live', 'exercise-rotation-live'],
  );
  assert.deepEqual(
    groundPlanMembershipCall('Quita del plan el ejercicio Movilidad asistida E2E.', [], call).input.exerciseIds,
    ['exercise-control-live', 'exercise-rotation-live'],
  );
});
