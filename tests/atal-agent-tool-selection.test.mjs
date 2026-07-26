import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const generalTurnMode = () => loadCore('src/features/atal-ai/core/agentic/generalTurnMode.js');
const toolSelection = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');
const toolCatalog = () => loadCore('src/features/atal-ai/api/agentToolCatalog.js');

function selection(text, intent = '', overrides = {}) {
  return toolSelection().selectAgentTools({
    text,
    route: '/assistant',
    intent,
    selectionHints: '',
    hasImageOrPdf: false,
    hasAudio: false,
    ...overrides,
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

test('compound patient maintenance exposes only the three requested mutations', () => {
  const tools = selection(
    'Para el paciente seleccionado, cambia su teléfono a 4441112233, añade una nota que diga exactamente “Mejora tolerancia al movimiento” y archiva al paciente. Haz las tres acciones ahora.',
    'update_patient_record',
  );
  assert.deepEqual(tools, ['app.read', 'patient.search', 'patient.update', 'patient.lifecycle', 'patient_note.add']);
});

test('archiving a patient does not expose unrelated plan lifecycle tools', () => {
  const tools = selection('Archiva al paciente seleccionado.', 'update_patient_record');
  assert.ok(tools.includes('patient.lifecycle'));
  assert.equal(tools.some((tool) => tool.startsWith('plan.')), false);
});

test('updating patient pain does not expose session mutations without a session request', () => {
  const tools = selection('Actualiza el dolor del paciente a 5 de 10.', 'update_patient_record');
  assert.ok(tools.includes('clinical_record.upsert'));
  assert.equal(tools.some((tool) => tool.startsWith('session.')), false);
  assert.equal(tools.includes('report.review'), false);
});

test('creating a plan for the selected patient exposes only plan creation', () => {
  const tools = selection(
    'Crea un plan nuevo para el paciente seleccionado llamado Rehabilitación lumbar, con frecuencia 4 días por semana, como borrador.',
    'create_plan_for_existing_patient',
  );
  assert.deepEqual(tools, ['app.read', 'patient.search', 'plan.create_simple']);
});

test('updating a selected plan field exposes only canonical field update', () => {
  const tools = selection(
    'Cambia la frecuencia del plan seleccionado a 5 días por semana. Hazlo ahora.',
    'update_existing_plan',
  );
  assert.deepEqual(tools, ['app.read', 'patient.search', 'plan.update_fields']);
});

test('compound plan maintenance exposes only field update and membership mutations', () => {
  const tools = selection(
    'En el plan seleccionado, cambia la frecuencia a 5 veces por semana y añade el ejercicio Control escapular IA. Haz ambos cambios ahora.',
    'update_existing_plan',
  );
  assert.deepEqual(tools, ['app.read', 'patient.search', 'plan.update_fields', 'plan.membership']);
});

test('underspecified treatment update stays read-only so Gemini must clarify before any mutation', () => {
  const tools = selection('Actualiza el tratamiento de Paciente E2E.', 'summarize_patient');
  assert.deepEqual(tools, ['app.read', 'patient.search']);
});

test('accented Spanish workspace question with inverted punctuation is classified as a real read', () => {
  const text = '¿Qué pacientes tengo registrados? Dime los nombres usando únicamente la información guardada en Atal.';
  const classification = generalTurnMode().classifyAgentTurn(text);
  assert.equal(classification.kind, 'read');
  assert.deepEqual(selection(text, 'summarize_patient'), ['app.read', 'patient.search']);
});

test('accented conceptual question with inverted punctuation remains conversation-only', () => {
  const classification = generalTurnMode().classifyAgentTurn('¿Qué es una contracción isométrica?');
  assert.equal(classification.kind, 'conversation');
  assert.deepEqual(selection('¿Qué es una contracción isométrica?'), []);
});

test('bare confirmation without prior conversational context never exposes mutation tools', () => {
  const tools = selection('Hazlo.', 'summarize_patient', { hasConversationContext: false });
  assert.deepEqual(tools, ['app.read', 'patient.search']);
});
