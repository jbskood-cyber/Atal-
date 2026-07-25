import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

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

test('starting a guided session exposes only start_or_resume', () => {
  assert.deepEqual(
    selection('Inicia una sesión guiada para el paciente y plan seleccionados. Hazlo ahora.'),
    ['app.read', 'patient.search', 'session.start_or_resume'],
  );
});

test('updating a session draft exposes only update_draft', () => {
  assert.deepEqual(
    selection('Actualiza el borrador de la sesión con dolor actual 4 y esfuerzo 6. Hazlo ahora.'),
    ['app.read', 'patient.search', 'session.update_draft'],
  );
});

test('completing a session exposes only session.complete', () => {
  assert.deepEqual(
    selection('Completa la sesión seleccionada y guárdala como completada. Hazlo ahora.'),
    ['app.read', 'patient.search', 'session.complete'],
  );
});

test('reviewing a report exposes only report.review', () => {
  assert.deepEqual(
    selection('Revisa el reporte de la sesión seleccionada y guarda la observación clínica indicada. Hazlo ahora.', 'create_report'),
    ['app.read', 'patient.search', 'report.review'],
  );
});
