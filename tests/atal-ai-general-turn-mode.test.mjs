import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const modeModule = () => loadCore('src/features/atal-ai/core/agentic/generalTurnMode.js');

 test('ordinary global conversation uses the universal agent', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Hola, ¿cómo puedes ayudarme?', hasDraft: false, draftModeArmed: false, hasImageOrPdf: false }), 'agent');
});

test('conceptual questions stay conversational without exposing workspace tools', () => {
  const result = modeModule().classifyAgentTurn('¿Qué es un recurso de lectura compatible?');
  assert.equal(result.kind, 'conversation');
  assert.deepEqual(result.allowedToolKinds, []);
});

test('patient count questions are grounded workspace reads', () => {
  const result = modeModule().classifyAgentTurn('Dime cuantos pacientes tengo por favor.');
  assert.equal(result.kind, 'read');
  assert.deepEqual(result.allowedToolKinds, ['read']);
});

test('workspace questions authorize read tools without authorizing writes', () => {
  const result = modeModule().classifyAgentTurn('¿Cuál fue la última sesión de Laura?');
  assert.equal(result.kind, 'read');
  assert.deepEqual(result.allowedToolKinds, ['read']);
});

test('elliptical follow-ups can continue a real-data comparison', () => {
  const result = modeModule().classifyAgentTurn('¿Y qué cambió respecto a la anterior?');
  assert.equal(result.kind, 'read');
  assert.deepEqual(result.allowedToolKinds, ['read']);
});

test('navigation requests can inspect entities and open the exact Atal route', () => {
  const result = modeModule().classifyAgentTurn('Abre el expediente de María.');
  assert.equal(result.kind, 'read');
  assert.deepEqual(result.allowedToolKinds, ['read']);
});

test('review requests create proposals without authorizing mutations', () => {
  const result = modeModule().classifyAgentTurn('Prepara una nota de seguimiento, pero no la guardes todavía.');
  assert.equal(result.kind, 'proposal');
  assert.deepEqual(result.allowedToolKinds, ['read']);
});

test('a note prepared for later review opens the structured draft workspace', () => {
  const text = 'Ayúdame a preparar una nota clínica breve para este paciente. La revisaré antes de aplicarla.';
  const result = modeModule().classifyAgentTurn(text);
  assert.equal(result.kind, 'proposal');
  assert.deepEqual(result.allowedToolKinds, ['read']);
  assert.equal(modeModule().selectGeneralTurnMode({ text, hasDraft: false, draftModeArmed: false, hasImageOrPdf: false }), 'draft');
});

test('explicit mutations authorize read and action tools', () => {
  const result = modeModule().classifyAgentTurn('Añade esta nota al expediente de Laura.');
  assert.equal(result.kind, 'action');
  assert.deepEqual(result.allowedToolKinds, ['read', 'action']);
});

test('natural confirmations of a prepared draft authorize actions', () => {
  for (const text of ['Ahora sí, guárdalo.', 'Hazlo.', 'Aplícalo.']) {
    const result = modeModule().classifyAgentTurn(text);
    assert.equal(result.kind, 'action', text);
    assert.deepEqual(result.allowedToolKinds, ['read', 'action']);
  }
});

test('explicit structured work restores the reviewable draft workspace', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Ayúdame con un nuevo ejercicio para movilidad de hombro', hasDraft: false, draftModeArmed: false, hasImageOrPdf: false }), 'draft');
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Prepara un plan de tratamiento de cuatro semanas', hasDraft: false, draftModeArmed: false, hasImageOrPdf: false }), 'draft');
});

test('an existing draft keeps explicit draft edits in draft mode', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Cambia la frecuencia a tres veces por semana', hasDraft: true, draftModeArmed: false, hasImageOrPdf: false }), 'draft');
});

test('an existing draft does not hijack unrelated conversation', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: '¿Qué significa la frecuencia de un plan?', hasDraft: true, draftModeArmed: false, hasImageOrPdf: false }), 'agent');
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Explícame qué hemos preparado hasta ahora.', hasDraft: true, draftModeArmed: false, hasImageOrPdf: false }), 'agent');
});

test('an explicit confirmation of an existing draft returns to the agent', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Ahora sí, guárdalo.', hasDraft: true, draftModeArmed: false, hasImageOrPdf: false }), 'agent');
});

test('descriptive image questions remain conversational and never become drafts automatically', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: '¿Qué aparece en esta imagen? No realices ningún cambio.', hasDraft: false, draftModeArmed: false, hasImageOrPdf: true }), 'agent');
});
