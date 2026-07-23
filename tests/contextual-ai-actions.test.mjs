import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const actionsModule = () => loadCore('src/features/atal-ai/contextual/actions.js');
const suggestionsModule = () => loadCore('src/features/atal-ai/contextual/suggestions.js');

const context = (surface, overrides = {}) => ({
  surface,
  route: surface === 'patient' ? '/patients/p01' : `/${surface}/entity-01`,
  patientId: 'p01',
  clinicalRecordId: 'record-p01',
  clinicalRecordVersion: 3,
  planId: 'pl01',
  exerciseId: 'e01',
  sessionId: 's01',
  reportId: 's01',
  contextLabel: `en este ${surface}`,
  entityLabel: 'Entidad QA',
  ...overrides,
});

const state = {
  patients: [{ id: 'p01', name: 'María QA', diagnosis: 'Rodilla', age: 41, affectedArea: 'Rodilla', status: 'active', visitType: 'followup', contact: { phone: '', email: '', address: '', emergencyContact: '' }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' }],
  clinicalRecords: [{ id: 'record-p01', patientId: 'p01', version: 3, reasonForVisit: 'Dolor', evolution: '', affectedArea: 'Rodilla', symptoms: [], painLevel: 3, providedDiagnosis: '', functionalLimitations: [], goals: [], relevantHistory: [], precautions: [], clinicalNotes: '', planId: 'pl01', professional: 'Cuenta demo', date: '2026-07-01T00:00:00.000Z', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' }],
  plans: [{ id: 'pl01', patientId: 'p01', title: 'Plan QA', focus: '', duration: '', frequency: '', goal: '', exerciseIds: ['e01'], status: 'active', progression: '', reportCriteria: '', generalInstructions: '', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' }],
  exercises: [{ id: 'e01', name: 'Ejercicio QA', region: 'Rodilla', category: 'Movilidad', objective: '', startingPosition: '', instructions: [], precautions: '', equipment: '', difficulty: '', sets: 3, repetitions: 10, rest: '', maxPain: 3, tags: [], notes: '', media: { type: 'none' }, status: 'active', source: 'local', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' }],
  sessions: [{ id: 's01', patientId: 'p01', planId: 'pl01', startedAt: '2026-07-10T10:00:00.000Z', completedAt: '2026-07-10T10:30:00.000Z', status: 'completed', startPain: 4, endPain: 3, startEnergy: 3, endEnergy: 4, effort: 5, symptoms: [], comment: '', easiest: '', hardest: '', discomfort: '', durationMinutes: 30, clinicalObservation: '', createdAt: '2026-07-10T10:30:00.000Z', updatedAt: '2026-07-10T10:30:00.000Z', exercises: {} }],
};

test('patient exterior actions are compact deterministic and never exceed two', () => {
  const { contextualActionsFor } = actionsModule();
  const actions = contextualActionsFor(context('patient'), state, 'exterior');
  assert.deepEqual(actions.map((item) => item.id), ['update-contact', 'view-progress']);
  assert.ok(actions.length <= 2);
  assert.ok(actions.every((item) => item.behavior === 'query' || item.behavior === 'proposal'));
});

test('each required surface exposes context-specific internal actions', () => {
  const { contextualActionsFor } = actionsModule();
  const expectations = {
    patient: ['update-contact', 'create-note', 'view-progress'],
    'clinical-record': ['summarize-record', 'complete-record', 'compare-evolution'],
    plan: ['review-plan', 'suggest-exercises', 'view-progress'],
    exercise: ['adapt-difficulty', 'review-instructions', 'add-to-plan'],
    report: ['summarize-session', 'compare-evolution', 'prepare-observation'],
  };
  for (const [surface, ids] of Object.entries(expectations)) {
    assert.deepEqual(contextualActionsFor(context(surface), state, 'internal').map((item) => item.id), ids);
  }
});

test('write-oriented quick actions prepare proposals and never execute a store mutation', () => {
  const { contextualActionsFor } = actionsModule();
  const patientActions = contextualActionsFor(context('patient'), state, 'internal');
  assert.equal(patientActions.find((item) => item.id === 'create-note').behavior, 'proposal');
  assert.equal(patientActions.find((item) => item.id === 'update-contact').behavior, 'proposal');
  assert.ok(patientActions.every((item) => typeof item.prompt === 'string' && item.prompt.length > 10));
});

test('patient suggestions state the stored reason and do not invent clinical facts', () => {
  const { contextualSuggestionsFor } = suggestionsModule();
  const suggestions = contextualSuggestionsFor(context('patient'), state);
  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0].id, 'missing-contact');
  assert.match(suggestions[0].reason, /teléfono|correo/i);
  assert.equal(suggestions[1].id, 'record-incomplete');
  assert.match(suggestions[1].reason, /evolución|diagnóstico/i);
});

test('plan and exercise suggestions derive only from missing stored fields', () => {
  const { contextualSuggestionsFor } = suggestionsModule();
  const planSuggestions = contextualSuggestionsFor(context('plan'), state);
  assert.equal(planSuggestions[0].id, 'plan-metadata-incomplete');
  assert.match(planSuggestions[0].reason, /duración|frecuencia|objetivo/i);
  const exerciseSuggestions = contextualSuggestionsFor(context('exercise'), state);
  assert.equal(exerciseSuggestions[0].id, 'exercise-instructions-missing');
  assert.match(exerciseSuggestions[0].reason, /instrucciones/i);
});

test('suggestions return an empty list when context target is unavailable', () => {
  const { contextualSuggestionsFor } = suggestionsModule();
  assert.deepEqual(contextualSuggestionsFor(context('patient', { patientId: 'missing' }), state), []);
  assert.deepEqual(contextualSuggestionsFor(context('exercise', { exerciseId: 'missing', patientId: '' }), state), []);
});
