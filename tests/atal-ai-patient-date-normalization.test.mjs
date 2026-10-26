import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const { normalizePatientBirthDate } = loadCore('src/features/atal-ai/core/tools/patientDate.js');

test('Spanish date of birth becomes canonical ISO without model-specific formatting', () => {
  assert.equal(normalizePatientBirthDate('4 de octubre de 2008'), '2008-10-04');
  assert.equal(normalizePatientBirthDate('04 de Octubre de 2008'), '2008-10-04');
  assert.equal(normalizePatientBirthDate('29 de febrero de 2024'), '2024-02-29');
  assert.equal(normalizePatientBirthDate('2008-10-04'), '2008-10-04');
});

test('unknown or impossible birth dates remain unchanged rather than guessed', () => {
  assert.equal(normalizePatientBirthDate('29 de febrero de 2025'), '29 de febrero de 2025');
  assert.equal(normalizePatientBirthDate('01/02/2008'), '01/02/2008');
  assert.equal(normalizePatientBirthDate('4 de mesdesconocido de 2008'), '4 de mesdesconocido de 2008');
  assert.equal(normalizePatientBirthDate(''), '');
});
