import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const toolSelection = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');

test('compound plan maintenance exposes field update and membership without unrelated mutations', () => {
  const tools = toolSelection().selectAgentTools({
    text: 'En el plan seleccionado, cambia la frecuencia a 5 veces por semana y añade el ejercicio Control escapular IA. Haz ambos cambios ahora.',
    route: '/assistant',
    intent: 'update_existing_plan',
    selectionHints: '',
    hasImageOrPdf: false,
    hasAudio: false,
  });

  assert.deepEqual(tools, ['app.read', 'patient.search', 'plan.update_fields', 'plan.membership']);
});
