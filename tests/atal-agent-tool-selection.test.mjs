import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const generalTurnMode = () => loadCore('src/features/atal-ai/core/agentic/generalTurnMode.js');
const toolSelection = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');
const toolCatalog = () => loadCore('src/features/atal-ai/api/agentToolCatalog.js');

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

function collectEnums(schema, path = 'parameters', found = []) {
  if (!schema || typeof schema !== 'object') return found;
  if (Array.isArray(schema.enum)) found.push({ path, values: schema.enum });
  if (schema.properties && typeof schema.properties === 'object') {
    for (const [key, value] of Object.entries(schema.properties)) collectEnums(value, `${path}.properties.${key}`, found);
  }
  if (schema.items) collectEnums(schema.items, `${path}.items`, found);
  return found;
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

test('Gemini-facing catalog never emits non-string enum values', () => {
  const { agentToolCatalog } = toolCatalog();
  const invalid = agentToolCatalog.flatMap((entry) =>
    collectEnums(entry.inputSchema).flatMap(({ path, values }) =>
      values.some((value) => typeof value !== 'string')
        ? [`${entry.name}:${path}:${JSON.stringify(values)}`]
        : []));

  assert.deepEqual(invalid, [], `Gemini function declarations only accept string enum values: ${invalid.join(', ')}`);
});

test('natural save confirmation for a new patient exposes only the composite patient create mutation', () => {
  const tools = selection('Por favor guárdalo.', 'create_patient_plan');
  assert.deepEqual(tools, ['app.read', 'patient.search', 'patient.create']);
});
