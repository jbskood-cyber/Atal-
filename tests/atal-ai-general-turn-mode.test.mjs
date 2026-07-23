import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const modeModule = () => loadCore('src/features/atal-ai/core/agentic/generalTurnMode.js');

test('ordinary global conversation uses the universal agent', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Hola, ¿cómo puedes ayudarme?', hasDraft: false, draftModeArmed: false, hasImageOrPdf: false }), 'agent');
});

test('explicit structured work restores the reviewable draft workspace', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Ayúdame con un nuevo ejercicio para movilidad de hombro', hasDraft: false, draftModeArmed: false, hasImageOrPdf: false }), 'draft');
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Prepara un plan de tratamiento de cuatro semanas', hasDraft: false, draftModeArmed: false, hasImageOrPdf: false }), 'draft');
});

test('an existing draft keeps follow-up messages in draft mode', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Cambia la frecuencia a tres veces por semana', hasDraft: true, draftModeArmed: false, hasImageOrPdf: false }), 'draft');
});

test('descriptive image questions remain conversational and never become drafts automatically', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: '¿Qué aparece en esta imagen? No realices ningún cambio.', hasDraft: false, draftModeArmed: false, hasImageOrPdf: true }), 'agent');
});
