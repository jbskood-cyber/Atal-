import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort } from './helpers/core-fixtures.mjs';

function invocation(input) {
  return {
    tool: 'session.complete',
    version: 1,
    input,
    references: [
      { type: 'patient', id: 'patient-1' },
      { type: 'plan', id: 'plan-1' },
    ],
    proposalId: 'proposal-session-complete-input',
  };
}

function proof(currentInvocation) {
  const { fingerprintInvocation } = loadCore('src/features/atal-ai/core/stableValue.js');
  return {
    id: 'confirmation-session-complete-input',
    fingerprint: fingerprintInvocation(currentInvocation),
    mode: 'explicit',
    confirmedAt: '2026-07-21T17:59:00.000Z',
    expiresAt: '2026-07-21T18:04:00.000Z',
  };
}

test('session.complete preserves explicit final metrics supplied at the public tool boundary', () => {
  const { executeToolInvocation } = loadCore('src/features/atal-ai/core/executionEngine.js');
  const port = memoryPort();
  const current = invocation({
    patient: { type: 'patient', id: 'patient-1' },
    plan: { type: 'plan', id: 'plan-1' },
    status: 'completed',
    endPain: 3,
    endEnergy: 6,
    effort: 5,
    comment: 'Sesión IA completada',
  });

  const gate = executeToolInvocation({ invocation: current, context: context() }, { port });
  assert.equal(gate.status, 'confirmation-required');

  const result = executeToolInvocation({ invocation: gate.invocation, context: context(), confirmation: proof(gate.invocation) }, { port });
  assert.equal(result.status, 'success');
  assert.deepEqual(result.clientEffect.draft, {
    endPain: 3,
    endEnergy: 6,
    effort: 5,
    endComment: 'Sesión IA completada',
    status: 'completed',
  });
});
