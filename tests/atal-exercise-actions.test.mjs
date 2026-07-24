import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const exerciseActions = () => loadCore('src/domain/actions/exerciseActions.js');

function baseState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2,
    seededAt: createdAt,
    updatedAt: createdAt,
    patients: [],
    plans: [{
      id: 'plan-1', patientId: 'patient-1', title: 'Plan', focus: '', duration: '', frequency: '', goal: '', exerciseIds: ['exercise-1'], status: 'paused', progression: '', reportCriteria: '', generalInstructions: '', createdAt, updatedAt: createdAt,
    }],
    exercises: [{
      id: 'exercise-1', name: 'Movilidad', region: 'Rodilla', category: 'Movilidad', objective: 'Mejorar movilidad', startingPosition: 'Sentado', instructions: ['Mover con control'], precautions: 'Sin dolor fuerte', equipment: 'Ninguno', difficulty: 'Inicial', sets: 3, repetitions: 10, time: undefined, rest: '30 s', maxPain: 3, tags: ['rodilla'], notes: 'Base', media: { type: 'image', mediaId: 'media-1', thumbnailId: 'thumb-1' }, status: 'active', source: 'seed', createdAt, updatedAt: createdAt,
    }],
    clinicalRecords: [], clinicalRecordVersions: [], sessions: [], notes: [], events: [], notifications: [],
    settings: { notifications: true, haptics: true, compact: true, professionalName: 'Fisio', specialty: 'Fisioterapia', clinic: '', sessionLock: true, clinicalPrivacy: true, aiSuggestions: true, aiAlerts: true, aiInstructions: '' },
    feedback: [],
  };
}

function eventIds(...ids) {
  let index = 0;
  return () => ids[index++] ?? `event-${index}`;
}

test('canonical exercise create normalizes clinical fields and emits the shared creation event', () => {
  const state = baseState();
  const { applyCreateExercise } = exerciseActions();
  const result = applyCreateExercise(state, {
    exerciseId: 'exercise-new',
    now: '2026-07-24T12:00:00.000Z',
    createEventId: eventIds('event-create'),
    exercise: {
      name: '  Extensión de rodilla  ', region: ' Rodilla ', category: ' Fuerza ', objective: ' Ganar fuerza ', startingPosition: ' Sentado ',
      instructions: [' Extiende ', 'Extiende', '  ', ' Baja con control '], precautions: ' Sin dolor ', equipment: ' Banda ', difficulty: ' Inicial ',
      sets: 3, repetitions: 12, time: undefined, rest: ' 30 s ', maxPain: 4, tags: [' rodilla ', 'fuerza', 'rodilla'], notes: ' Nota ', media: { type: 'none' },
    },
  });

  assert.equal(result.exercise.id, 'exercise-new');
  assert.equal(result.exercise.name, 'Extensión de rodilla');
  assert.equal(result.exercise.region, 'Rodilla');
  assert.deepEqual(result.exercise.instructions, ['Extiende', 'Baja con control']);
  assert.deepEqual(result.exercise.tags, ['rodilla', 'fuerza']);
  assert.equal(result.exercise.status, 'active');
  assert.equal(result.exercise.source, 'local');
  assert.equal(result.exercise.createdAt, '2026-07-24T12:00:00.000Z');
  assert.equal(result.exercise.updatedAt, '2026-07-24T12:00:00.000Z');
  assert.equal(state.events[0].kind, 'exercise_created');
  assert.equal(state.events[0].id, 'event-create');
});

test('canonical exercise create rejects invalid prescription with zero mutation', () => {
  const state = baseState();
  const before = structuredClone(state);
  const { applyCreateExercise } = exerciseActions();
  assert.throws(() => applyCreateExercise(state, {
    exerciseId: 'exercise-new', now: '2026-07-24T12:00:00.000Z', createEventId: eventIds('event-create'),
    exercise: { name: 'Ejercicio', region: 'General', category: 'Personalizado', objective: '', startingPosition: '', instructions: [], precautions: '', equipment: '', difficulty: '', sets: 0, repetitions: 10, rest: '', maxPain: 3, tags: [], notes: '', media: { type: 'none' } },
  }), /series.*al menos 1/i);
  assert.deepEqual(state, before);
});

test('canonical exercise update preserves identity, media, source and createdAt', () => {
  const state = baseState();
  const { applyUpdateExercise } = exerciseActions();
  const original = structuredClone(state.exercises[0]);
  const result = applyUpdateExercise(state, {
    exerciseId: 'exercise-1', now: '2026-07-24T12:30:00.000Z',
    patch: { name: '  Movilidad editada ', instructions: [' Uno ', 'Uno', 'Dos'], tags: [' movilidad ', 'movilidad'], sets: 4, maxPain: 5 },
  });

  assert.equal(result.exercise.id, original.id);
  assert.equal(result.exercise.createdAt, original.createdAt);
  assert.equal(result.exercise.source, original.source);
  assert.deepEqual(result.exercise.media, original.media);
  assert.equal(result.exercise.status, original.status);
  assert.equal(result.exercise.name, 'Movilidad editada');
  assert.deepEqual(result.exercise.instructions, ['Uno', 'Dos']);
  assert.deepEqual(result.exercise.tags, ['movilidad']);
  assert.equal(result.exercise.sets, 4);
  assert.equal(result.exercise.maxPain, 5);
  assert.equal(result.exercise.updatedAt, '2026-07-24T12:30:00.000Z');
});

test('canonical exercise update rejects invalid values atomically', () => {
  const state = baseState();
  const before = structuredClone(state);
  const { applyUpdateExercise } = exerciseActions();
  assert.throws(() => applyUpdateExercise(state, {
    exerciseId: 'exercise-1', now: '2026-07-24T12:30:00.000Z', patch: { maxPain: 11 },
  }), /dolor.*entre 0 y 10/i);
  assert.deepEqual(state, before);
});

test('canonical duplicate creates a local active state copy while preserving media reference for adapter cloning', () => {
  const state = baseState();
  const { applyDuplicateExercise } = exerciseActions();
  const result = applyDuplicateExercise(state, {
    exerciseId: 'exercise-1', duplicateId: 'exercise-copy', now: '2026-07-24T13:00:00.000Z', name: ' Copia clínica ', createEventId: eventIds('event-copy'),
  });

  assert.equal(result.exercise.id, 'exercise-copy');
  assert.equal(result.exercise.name, 'Copia clínica');
  assert.equal(result.exercise.status, 'active');
  assert.equal(result.exercise.source, 'local');
  assert.deepEqual(result.exercise.media, state.exercises[0].media);
  assert.notEqual(result.exercise.media, state.exercises[0].media);
  assert.equal(result.exercise.createdAt, '2026-07-24T13:00:00.000Z');
  assert.equal(result.exercise.updatedAt, '2026-07-24T13:00:00.000Z');
  assert.equal(state.events[0].kind, 'exercise_created');
});

test('canonical lifecycle archives and restores without changing identity or plan membership', () => {
  const state = baseState();
  const { applyExerciseLifecycle } = exerciseActions();
  const createdAt = state.exercises[0].createdAt;
  let result = applyExerciseLifecycle(state, { exerciseId: 'exercise-1', archived: true, now: '2026-07-24T14:00:00.000Z' });
  assert.equal(result.exercise.status, 'archived');
  assert.equal(result.exercise.createdAt, createdAt);
  assert.deepEqual(state.plans[0].exerciseIds, ['exercise-1']);

  result = applyExerciseLifecycle(state, { exerciseId: 'exercise-1', archived: false, now: '2026-07-24T14:10:00.000Z' });
  assert.equal(result.exercise.status, 'active');
  assert.equal(result.exercise.createdAt, createdAt);
  assert.deepEqual(state.plans[0].exerciseIds, ['exercise-1']);
});
