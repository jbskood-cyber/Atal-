import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const generalTurnMode = () => loadCore('src/features/atal-ai/core/agentic/generalTurnMode.js');
const toolSelection = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');

function selection(text, intent = '') {
  return toolSelection().selectAgentTools({
    text,
    route: '/assistant',
    intent,
    selectionHints: '',
    hasImageOrPdf: false,
    hasAudio: false,
  });
}

test('natural adjust command is classified as an action and enables exercise update tools', () => {
  const classification = generalTurnMode().classifyAgentTurn('Ajusta a 4 series el ejercicio seleccionado.');
  assert.equal(classification.kind, 'action');
  assert.ok(classification.allowedToolKinds.includes('action'));

  const tools = selection('Ajusta a 4 series el ejercicio seleccionado.', 'update_exercise');
  assert.ok(tools.includes('exercise.update_fields'));
  assert.ok(tools.includes('exercise.lifecycle'));
});

test('routine/library wording enables canonical exercise creation for an explicit register action', () => {
  const classification = generalTurnMode().classifyAgentTurn('Registra en la biblioteca la rutina que te indico.');
  assert.equal(classification.kind, 'action');

  const tools = selection('Registra en la biblioteca la rutina que te indico.');
  assert.ok(tools.includes('exercise.create_simple'));
});
