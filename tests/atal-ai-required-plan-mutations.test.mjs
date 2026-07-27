import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const requirementsModule = () => loadCore('src/features/atal-ai/core/agentic/compoundActionRequirements.js');

function input(overrides = {}) {
  return {
    text: 'Quítale al plan el ejercicio Movilidad asistida E2E.',
    route: '/assistant',
    intent: 'update_existing_plan',
    selectionHints: '',
    hasImageOrPdf: false,
    hasAudio: false,
    hasConversationContext: true,
    ...overrides,
  };
}

test('an explicit single plan membership mutation is required before the agent may narrate completion', () => {
  const { requiredAgentToolsForSelection } = requirementsModule();
  assert.deepEqual(
    requiredAgentToolsForSelection(input(), ['app.read', 'patient.search', 'plan.membership']),
    ['plan.membership'],
  );
});

test('unrelated single plan mutations keep the previous completion contract', () => {
  const { requiredAgentToolsForSelection } = requirementsModule();
  assert.deepEqual(
    requiredAgentToolsForSelection(input({ text: 'Cambia la frecuencia de este plan a 4 veces por semana.' }), ['app.read', 'patient.search', 'plan.update_fields']),
    [],
  );
});

test('read-only plan turns do not invent required mutations', () => {
  const { requiredAgentToolsForSelection } = requirementsModule();
  assert.deepEqual(
    requiredAgentToolsForSelection(input({ text: '¿Qué ejercicios tiene este plan?' }), ['app.read', 'patient.search']),
    [],
  );
});
