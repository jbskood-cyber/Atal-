import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const moduleUnderTest = () => loadCore('src/features/atal-ai/core/agentic/sessionPatchSelection.js');

test('session completion requires only final metrics explicitly supplied by the user', () => {
  const { selectSessionPatchKeys } = moduleUnderTest();
  assert.deepEqual(
    selectSessionPatchKeys('Completa la sesión como completada con dolor final 3, energía final 6, esfuerzo 5 y comentario “Sesión IA completada”. Hazlo ahora.'),
    ['endPain', 'endEnergy', 'effort', 'endComment'],
  );
});

test('session completion does not invent final metrics that the user did not provide', () => {
  const { selectSessionPatchKeys } = moduleUnderTest();
  assert.deepEqual(selectSessionPatchKeys('Completa la sesión como completada. Hazlo ahora.'), []);
});
