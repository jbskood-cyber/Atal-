import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const toolSelection = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');
const clarification = () => loadCore('src/features/atal-ai/core/agentic/freshRequestClarification.js');

function select(text, intent = 'update_existing_plan', hasConversationContext = true) {
  return toolSelection().selectAgentTools({
    text,
    route: '/assistant',
    intent,
    selectionHints: 'Paciente E2E · Plan activo E2E',
    hasImageOrPdf: false,
    hasAudio: false,
    hasConversationContext,
  });
}

test('natural plan dose edit exposes exercise.update_fields instead of misrouting the request to plan.update_fields only', () => {
  const tools = select('Cámbiale al segundo ejercicio la dosis a 4 series de 10 repeticiones.');
  assert.deepEqual(tools, ['app.read', 'patient.search', 'exercise.update_fields']);
});

test('natural plan exercise replacement exposes membership operations instead of treating replacement as a plan field edit', () => {
  const tools = select('Sustituye el segundo ejercicio del plan por Control escapular E2E.');
  assert.deepEqual(tools, ['app.read', 'patient.search', 'plan.membership']);
});

test('natural clitic add exercise request exposes plan membership', () => {
  const tools = select('Agrégale al plan el ejercicio Control escapular E2E.');
  assert.deepEqual(tools, ['app.read', 'patient.search', 'plan.membership']);
});

test('natural clitic remove exercise request exposes plan membership', () => {
  const tools = select('Quítale al plan el ejercicio Puente lumbar E2E.');
  assert.deepEqual(tools, ['app.read', 'patient.search', 'plan.membership']);
});

test('compound natural plan and exercise edit exposes both canonical tools and nothing broader', () => {
  const tools = select('Cámbiale la frecuencia a cuatro sesiones por semana y al segundo ejercicio ponle 4 series de 10 repeticiones.');
  assert.deepEqual(tools, ['app.read', 'patient.search', 'plan.update_fields', 'exercise.update_fields']);
});

test('explicit plan field edit remains scoped to plan.update_fields', () => {
  const tools = select('Cámbiale la frecuencia del plan a cuatro sesiones por semana.');
  assert.deepEqual(tools, ['app.read', 'patient.search', 'plan.update_fields']);
});

test('fresh underspecified treatment mutation is clarified without exposing write tools', () => {
  const text = 'Actualiza el tratamiento de Paciente E2E.';
  const tools = select(text, 'update_existing_plan', false);
  assert.deepEqual(tools, ['app.read', 'patient.search']);
  assert.equal(
    clarification().freshRequestClarification(text, false),
    '¿Qué quieres modificar del tratamiento de Paciente E2E?',
  );
});

test('the same short treatment reference may remain agentic when prior conversation context exists', () => {
  const text = 'Actualiza el tratamiento de Paciente E2E.';
  assert.equal(clarification().freshRequestClarification(text, true), undefined);
});
