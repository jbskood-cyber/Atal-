import assert from 'node:assert/strict';
import test from 'node:test';
import { commitNumericDraft } from '../src/lib/numericInput.ts';

test('keeps an empty numeric draft editable and restores the fallback on commit', () => {
  assert.equal(commitNumericDraft('', { fallback: 12, min: 0 }), 12);
});

test('clamps committed values without changing the draft while typing', () => {
  assert.equal(commitNumericDraft('18', { fallback: 0, min: 0, max: 10 }), 10);
});

test('accepts decimal commas used by mobile keyboards', () => {
  assert.equal(commitNumericDraft('2,5', { fallback: 0, min: 0 }), 2.5);
});
