import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const modeModule = () => loadCore('src/features/atal-ai/core/agentic/generalTurnMode.js');

test('ordinary global conversation uses the universal agent', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Hola, ¿cómo puedes ayudarme?', hasDraft: false, draftModeArmed: false, hasImageOrPdf: false }), 'agent');
});

test('conceptual questions stay conversational and do not authorize tools', () => {
  const result = modeModule().classifyAgentTurn('¿Qué es un recurso de lectura compatible?');
  assert.equal(result.kind, 'conversation');
  assert.deepEqual(result.allowedToolKinds, []);
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

test('review requests create proposals without authorizing mutations', () => {
  const result = modeModule().classifyAgentTurn('Prepara una nota de seguimiento, pero no la guardes todavía.');
  assert.equal(result.kind, 'proposal');
  assert.deepEqual(result.allowedToolKinds, ['read']);
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

test('an existing draft keeps non-action follow-up messages in draft mode', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: 'Cambia la frecuencia a tres veces por semana', hasDraft: true, draftModeArmed: false, hasImageOrPdf: false }), 'draft');
});

test('descriptive image questions remain conversational and never become drafts automatically', () => {
  assert.equal(modeModule().selectGeneralTurnMode({ text: '¿Qué aparece en esta imagen? No realices ningún cambio.', hasDraft: false, draftModeArmed: false, hasImageOrPdf: true }), 'agent');
});
