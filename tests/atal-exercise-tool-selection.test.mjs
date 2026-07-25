import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const toolSelection = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');

function selection(text, intent) {
  return toolSelection().selectAgentTools({
    text,
    route: '/assistant',
    intent,
    selectionHints: '',
    hasImageOrPdf: false,
    hasAudio: false,
  });
}

test('creating an exercise exposes only the canonical create mutation', () => {
  assert.deepEqual(
    selection('Crea un ejercicio nuevo llamado Remo escapular.', 'create_exercise'),
    ['app.read', 'patient.search', 'exercise.create_simple'],
  );
});

test('editing an exercise exposes only the canonical field update mutation', () => {
  assert.deepEqual(
    selection('En el ejercicio seleccionado cambia las repeticiones a 12 y las series a 4.', 'update_existing_exercise'),
    ['app.read', 'patient.search', 'exercise.update_fields'],
  );
});

test('archiving an exercise exposes only the canonical lifecycle mutation', () => {
  assert.deepEqual(
    selection('Archiva el ejercicio seleccionado. Hazlo ahora.', 'update_existing_exercise'),
    ['app.read', 'patient.search', 'exercise.lifecycle'],
  );
});
