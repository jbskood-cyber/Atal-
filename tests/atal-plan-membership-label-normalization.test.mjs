import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort, validState } from './helpers/core-fixtures.mjs';

const engineModule = () => loadCore('src/features/atal-ai/core/executionEngine.js');
const stableModule = () => loadCore('src/features/atal-ai/core/stableValue.js');

function invocation(input) {
  return {
    tool: 'plan.membership',
    version: 1,
    input,
    references: [{ type: 'plan', id: 'plan-1' }],
    proposalId: 'proposal-plan-membership-label-normalization',
  };
}

function confirmation(currentInvocation) {
  const { fingerprintInvocation } = stableModule();
  return {
    id: 'confirmation-plan-membership-label-normalization',
    fingerprint: fingerprintInvocation(currentInvocation),
    mode: 'review',
    confirmedAt: '2026-07-21T17:59:00.000Z',
    expiresAt: '2026-07-21T18:04:00.000Z',
  };
}

function execute(port, currentInvocation, proof) {
  const { executeToolInvocation } = engineModule();
  return executeToolInvocation(
    { invocation: currentInvocation, context: context(), confirmation: proof },
    { port },
  );
}

test('plan.membership normalizes a unique exact exercise label to its canonical id before mutation', () => {
  const state = validState();
  state.exercises[0].id = 'exercise-control-live';
  state.exercises[0].name = 'Control escapular Natural QA';
  state.exercises.push({
    ...structuredClone(state.exercises[0]),
    id: 'exercise-rotation-live',
    name: 'Rotación externa Natural QA',
  });
  state.plans[0].id = 'plan-1';
  state.plans[0].exerciseIds = ['exercise-control-live'];

  const port = memoryPort(state);
  const current = invocation({
    plan: { type: 'plan', id: 'plan-1' },
    operation: 'add',
    exerciseIds: ['Rotación externa Natural QA'],
  });

  const gate = execute(port, current);
  assert.equal(gate.status, 'confirmation-required');

  const result = execute(port, gate.invocation, confirmation(gate.invocation));
  assert.equal(result.status, 'success', JSON.stringify(result));
  assert.deepEqual(port.read().plans[0].exerciseIds, ['exercise-control-live', 'exercise-rotation-live']);
  assert.deepEqual(result.data.exerciseIds, ['exercise-control-live', 'exercise-rotation-live']);
  assert.equal(port.read().plans[0].exerciseIds.includes('Rotación externa Natural QA'), false);
});

test('plan.membership refuses an ambiguous exercise label instead of guessing', () => {
  const state = validState();
  state.exercises[0].id = 'exercise-a';
  state.exercises[0].name = 'Rotación externa Natural QA';
  state.exercises.push({
    ...structuredClone(state.exercises[0]),
    id: 'exercise-b',
    name: 'rotacion externa natural qa',
  });
  state.plans[0].id = 'plan-1';
  state.plans[0].exerciseIds = [];

  const port = memoryPort(state);
  const current = invocation({
    plan: { type: 'plan', id: 'plan-1' },
    operation: 'add',
    exerciseIds: ['Rotación externa Natural QA'],
  });

  const gate = execute(port, current);
  assert.equal(gate.status, 'confirmation-required');
  const result = execute(port, gate.invocation, confirmation(gate.invocation));
  assert.equal(result.status, 'error');
  assert.equal(result.code, 'CORE_PRECONDITION_FAILED');
  assert.deepEqual(port.read().plans[0].exerciseIds, []);
});
