import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const policyModule = () => loadCore('src/features/atal-ai/core/riskPolicy.js');
const stableModule = () => loadCore('src/features/atal-ai/core/stableValue.js');
const now = '2026-07-21T18:00:00.000Z';

function invocation(input = { planId: 'plan-1' }) {
  return {
    tool: 'plan.pause',
    version: 1,
    input,
    references: [{ type: 'plan', id: 'plan-1' }],
    proposalId: 'proposal-1',
  };
}

function definition(risk) {
  return {
    name: 'plan.pause',
    version: 1,
    risk,
    mutates: risk !== 'read' && risk !== 'draft' && risk !== 'external',
    supportsUndo: risk === 'reversible-write' || risk === 'sensitive-write' || risk === 'destructive',
    requiredEntities: ['plan'],
    validateInput: (input) => input,
    preconditions() {},
    execute() {
      return { status: 'success', message: 'ok', summary: [], affected: [] };
    },
  };
}

function proof(mode, currentInvocation = invocation(), patch = {}) {
  const { fingerprintInvocation } = stableModule();
  return {
    id: 'confirmation-1',
    fingerprint: fingerprintInvocation(currentInvocation),
    mode,
    confirmedAt: '2026-07-21T17:59:00.000Z',
    expiresAt: '2026-07-21T18:04:00.000Z',
    ...patch,
  };
}

test('policy maps every registry risk without proof', () => {
  const { decideExecutionPolicy } = policyModule();
  const expected = {
    read: 'none',
    draft: 'review',
    'reversible-write': 'review',
    'sensitive-write': 'explicit',
    destructive: 'reinforced',
    external: 'blocked',
  };
  for (const [risk, mode] of Object.entries(expected)) {
    assert.equal(decideExecutionPolicy(definition(risk), invocation(), undefined, now).mode, mode);
  }
});

test('valid proof opens the gate and stronger proof satisfies weaker mode', () => {
  const { decideExecutionPolicy } = policyModule();
  assert.equal(decideExecutionPolicy(definition('reversible-write'), invocation(), proof('review'), now).mode, 'none');
  assert.equal(decideExecutionPolicy(definition('reversible-write'), invocation(), proof('explicit'), now).mode, 'none');
  assert.equal(decideExecutionPolicy(definition('sensitive-write'), invocation(), proof('reinforced'), now).mode, 'none');
  assert.equal(decideExecutionPolicy(definition('destructive'), invocation(), proof('reinforced'), now).mode, 'none');
});

test('weaker proof cannot satisfy a stronger registry-owned risk', () => {
  const { decideExecutionPolicy } = policyModule();
  assert.equal(decideExecutionPolicy(definition('sensitive-write'), invocation(), proof('review'), now).mode, 'explicit');
  assert.equal(decideExecutionPolicy(definition('destructive'), invocation(), proof('explicit'), now).mode, 'reinforced');
});

test('changed input or reference invalidates confirmation fingerprint', () => {
  const { decideExecutionPolicy } = policyModule();
  const originalProof = proof('explicit');
  assert.equal(
    decideExecutionPolicy(definition('sensitive-write'), invocation({ planId: 'plan-2' }), originalProof, now).mode,
    'explicit',
  );
  const changedReference = { ...invocation(), references: [{ type: 'plan', id: 'plan-2' }] };
  assert.equal(
    decideExecutionPolicy(definition('sensitive-write'), changedReference, originalProof, now).mode,
    'explicit',
  );
});

test('proof expires at its expiry or five minutes after confirmation', () => {
  const { decideExecutionPolicy } = policyModule();
  const expired = proof('review', invocation(), { expiresAt: '2026-07-21T17:59:59.000Z' });
  assert.equal(decideExecutionPolicy(definition('reversible-write'), invocation(), expired, now).mode, 'review');

  const overlong = proof('review', invocation(), {
    confirmedAt: '2026-07-21T17:50:00.000Z',
    expiresAt: '2026-07-21T19:00:00.000Z',
  });
  assert.equal(decideExecutionPolicy(definition('reversible-write'), invocation(), overlong, now).mode, 'review');
});

test('model-provided risk never overrides the registered definition', () => {
  const { decideExecutionPolicy } = policyModule();
  const malicious = invocation({ planId: 'plan-1', risk: 'read', confirmation: 'none' });
  assert.equal(decideExecutionPolicy(definition('sensitive-write'), malicious, undefined, now).mode, 'explicit');
});

test('external operations remain blocked even with reinforced proof', () => {
  const { decideExecutionPolicy } = policyModule();
  assert.equal(decideExecutionPolicy(definition('external'), invocation(), proof('reinforced'), now).mode, 'blocked');
});
