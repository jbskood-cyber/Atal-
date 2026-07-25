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

test('activating a selected plan exposes only the canonical activation mutation', () => {
  assert.deepEqual(
    selection('Activa el plan seleccionado. Hazlo ahora.', 'update_plan_status'),
    ['app.read', 'patient.search', 'plan.activate'],
  );
});

test('archiving a selected plan exposes only the canonical archive mutation', () => {
  assert.deepEqual(
    selection('Archiva el plan seleccionado. Hazlo ahora.', 'archive_plan'),
    ['app.read', 'patient.search', 'plan.archive'],
  );
});
