import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const stable = () => loadCore('src/features/atal-ai/core/stableValue.js');

test('stable serialization ignores object key insertion order', () => {
  const { stableSerialize } = stable();
  assert.equal(
    stableSerialize({ b: 2, a: { d: 4, c: 3 } }),
    stableSerialize({ a: { c: 3, d: 4 }, b: 2 }),
  );
});

test('stable serialization preserves array order and represents undefined', () => {
  const { stableSerialize } = stable();
  assert.notEqual(stableSerialize([1, 2]), stableSerialize([2, 1]));
  assert.notEqual(stableSerialize({ value: undefined }), stableSerialize({}));
});

test('stable serialization rejects cycles and executable values', () => {
  const { stableSerialize } = stable();
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => stableSerialize(cycle), /cyclic/i);
  assert.throws(() => stableSerialize({ value() {} }), /function/i);
  assert.throws(() => stableSerialize(Symbol('unsafe')), /symbol/i);
});

test('entity labels normalize accents case and whitespace', () => {
  const { normalizeEntityLabel } = stable();
  assert.equal(normalizeEntityLabel('  José   Álvarez '), 'jose alvarez');
});

test('proposal fingerprint is stable across key order', () => {
  const { fingerprintInvocation } = stable();
  const first = {
    tool: 'plan.pause',
    version: 1,
    input: { reason: 'reviewed', planId: 'p1' },
    references: [{ type: 'plan', id: 'p1' }],
    proposalId: 'q1',
  };
  const second = {
    proposalId: 'q1',
    references: [{ id: 'p1', type: 'plan' }],
    input: { planId: 'p1', reason: 'reviewed' },
    version: 1,
    tool: 'plan.pause',
  };
  assert.equal(fingerprintInvocation(first), fingerprintInvocation(second));
});

test('proposal fingerprint changes with input reference or proposal', () => {
  const { fingerprintInvocation } = stable();
  const base = {
    tool: 'plan.pause',
    version: 1,
    input: { planId: 'p1' },
    references: [{ type: 'plan', id: 'p1' }],
    proposalId: 'q1',
  };
  assert.notEqual(fingerprintInvocation(base), fingerprintInvocation({ ...base, input: { planId: 'p2' } }));
  assert.notEqual(fingerprintInvocation(base), fingerprintInvocation({ ...base, references: [{ type: 'plan', id: 'p2' }] }));
  assert.notEqual(fingerprintInvocation(base), fingerprintInvocation({ ...base, proposalId: 'q2' }));
});
