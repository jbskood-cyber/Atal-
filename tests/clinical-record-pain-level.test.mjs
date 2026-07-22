import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCore } from './helpers/core-modules.mjs';

const painLevel = () => loadCore('src/features/clinical-record/types.js');
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('rejects descriptive and non-finite pain input instead of producing NaN', () => {
  const { parsePainLevelInput } = painLevel();
  for (const input of ['3 de 10 - demostrativo.', 'NaN', 'Infinity', '-1', '11']) {
    const result = parsePainLevelInput(input);
    assert.equal(result.ok, false, `expected ${input} to be rejected`);
  }
});

test('accepts empty and finite pain values from 0 to 10', () => {
  const { parsePainLevelInput } = painLevel();
  assert.deepEqual(parsePainLevelInput(''), { ok: true, value: null });
  assert.deepEqual(parsePainLevelInput('0'), { ok: true, value: 0 });
  assert.deepEqual(parsePainLevelInput('3.5'), { ok: true, value: 3.5 });
  assert.deepEqual(parsePainLevelInput('3,5'), { ok: true, value: 3.5 });
  assert.deepEqual(parsePainLevelInput('10'), { ok: true, value: 10 });
});

test('formats only finite stored pain values', () => {
  const { formatPainLevel } = painLevel();
  assert.equal(formatPainLevel(null), '');
  assert.equal(formatPainLevel(3), '3');
  assert.equal(formatPainLevel(Number.NaN), '');
  assert.equal(formatPainLevel(Number.POSITIVE_INFINITY), '');
});

test('clinical record screen validates the pain draft before persistence', () => {
  const screen = read('src/features/clinical-record/ClinicalRecordScreen.tsx');
  assert.match(screen, /parsePainLevelInput\(painInput\)/);
  assert.match(screen, /inputMode="decimal"/);
  assert.doesNotMatch(screen, /key === 'painLevel' \? \(value \? Number\(value\) : null\)/);
});
