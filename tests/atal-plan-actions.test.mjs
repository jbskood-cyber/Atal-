import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const planActions = () => loadCore('src/domain/actions/planActions.js');

function baseState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2,
    seededAt: createdAt,
    updatedAt: createdAt,
    patients: [{
      id: 'patient-1', name: 'José Pérez', diagnosis: 'Dolor de rodilla', age: 32, birthDate: '', sex: '', affectedArea: 'Rodilla', status: 'active', visitType: 'followup', contact: { phone: '', email: '', address: '', emergencyContact: '' }, createdAt, updatedAt: createdAt,
    }],
    plans: [{
      id: 'plan-active', patientId: 'patient-1', title: 'Plan activo', focus: 'Movilidad', duration: '4 semanas', frequency: '3 días', goal: 'Recuperar función', exerciseIds: ['exercise-1'], status: 'active', progression: '', reportCriteria: '', generalInstructions: '', createdAt, updatedAt: createdAt,
    }],
    exercises: [
      { id: 'exercise-1', name: 'Movilidad', region: 'Rodilla', category: 'Movilidad', objective: '', startingPosition: '', instructions: [], precautions: '', equipment: '', difficulty: 'Inicial', sets: 3, repetitions: 10, rest: '', maxPain: 3, tags: [], notes: '', media: { type: 'none' }, status: 'active', source: 'local', createdAt, updatedAt: createdAt },
      { id: 'exercise-2', name: 'Fuerza', region: 'Rodilla', category: 'Fuerza', objective: '', startingPosition: '', instructions: [], precautions: '', equipment: '', difficulty: 'Inicial', sets: 3, repetitions: 10, rest: '', maxPain: 3, tags: [], notes: '', media: { type: 'none' }, status: 'active', source: 'local', createdAt, updatedAt: createdAt },
    ],
    clinicalRecords: [{
      id: 'record-1', patientId: 'patient-1', version: 1, date: createdAt, reasonForVisit: 'Dolor', evolution: '', affectedArea: 'Rodilla', symptoms: [], painLevel: 4, providedDiagnosis: '', functionalLimitations: [], goals: [], relevantHistory: [], precautions: [], clinicalNotes: '', planId: 'plan-active', professional: 'Fisio prueba', createdAt, updatedAt: createdAt,
    }],
    clinicalRecordVersions: [], sessions: [], notes: [], events: [], notifications: [],
    settings: { notifications: true, haptics: true, compact: true, professionalName: 'Fisio prueba', specialty: 'Fisioterapia', clinic: '', sessionLock: true, clinicalPrivacy: true, aiSuggestions: true, aiAlerts: true, aiInstructions: '' },
    feedback: [],
  };
}

function idFactory(...ids) {
  let index = 0;
  return () => ids[index++] ?? `generated-${index}`;
}

const draftInput = {
  title: ' Plan nuevo ', focus: ' Fuerza ', duration: '6 semanas', frequency: '4 días', goal: 'Mejorar fuerza', exerciseIds: ['exercise-1', 'exercise-1', 'exercise-2'], status: 'draft', progression: '', reportCriteria: '', generalInstructions: '',
};

test('canonical plan creation rejects active plans without exercises with zero mutation', () => {
  const state = baseState();
  state.plans = [];
  const before = structuredClone(state);
  const { applyCreatePlan } = planActions();
  assert.throws(() => applyCreatePlan(state, {
    patientId: 'patient-1', planId: 'plan-new', now: '2026-07-24T12:00:00.000Z', createEventId: idFactory('event-1'), plan: { ...draftInput, status: 'active', exerciseIds: [] },
  }), /activo necesita al menos un ejercicio/i);
  assert.deepEqual(state, before);
});

test('canonical plan creation rejects nonexistent exercises and a second active plan', () => {
  const { applyCreatePlan } = planActions();
  const missingExercise = baseState();
  assert.throws(() => applyCreatePlan(missingExercise, {
    patientId: 'patient-1', planId: 'plan-new', now: '2026-07-24T12:00:00.000Z', createEventId: idFactory('event-1'), plan: { ...draftInput, exerciseIds: ['exercise-missing'] },
  }), /ejercicio inexistente/i);
  assert.equal(missingExercise.plans.length, 1);
  assert.equal(missingExercise.events.length, 0);

  const secondActive = baseState();
  assert.throws(() => applyCreatePlan(secondActive, {
    patientId: 'patient-1', planId: 'plan-new', now: '2026-07-24T12:00:00.000Z', createEventId: idFactory('event-2'), plan: { ...draftInput, status: 'active', exerciseIds: ['exercise-2'] },
  }), /ya tiene un plan activo/i);
  assert.equal(secondActive.plans.length, 1);
  assert.equal(secondActive.events.length, 0);
});

test('canonical draft creation dedupes exercises, preserves ownership and syncs the clinical record association', () => {
  const state = baseState();
  state.plans[0].status = 'paused';
  const { applyCreatePlan } = planActions();
  const result = applyCreatePlan(state, {
    patientId: 'patient-1', planId: 'plan-new', now: '2026-07-24T12:00:00.000Z', createEventId: idFactory('event-create'), plan: draftInput,
  });
  assert.equal(result.plan.id, 'plan-new');
  assert.equal(result.plan.patientId, 'patient-1');
  assert.equal(result.plan.title, 'Plan nuevo');
  assert.equal(result.plan.focus, 'Fuerza');
  assert.deepEqual(result.plan.exerciseIds, ['exercise-1', 'exercise-2']);
  assert.equal(result.plan.createdAt, '2026-07-24T12:00:00.000Z');
  assert.equal(state.events[0].kind, 'plan_created');
  assert.equal(state.clinicalRecords[0].planId, 'plan-new');
  assert.equal(state.clinicalRecords[0].updatedAt, '2026-07-24T12:00:00.000Z');
});

test('canonical plan update preserves identity and validates exercise membership atomically', () => {
  const state = baseState();
  state.plans[0].status = 'paused';
  const { applyUpdatePlan } = planActions();
  const createdAt = state.plans[0].createdAt;
  const result = applyUpdatePlan(state, {
    planId: 'plan-active', now: '2026-07-24T12:30:00.000Z', createEventId: idFactory('event-update'), patch: { title: ' Plan editado ', exerciseIds: ['exercise-2', 'exercise-2'] },
  });
  assert.equal(result.plan.id, 'plan-active');
  assert.equal(result.plan.patientId, 'patient-1');
  assert.equal(result.plan.createdAt, createdAt);
  assert.equal(result.plan.title, 'Plan editado');
  assert.deepEqual(result.plan.exerciseIds, ['exercise-2']);
  assert.equal(state.events[0].kind, 'plan_updated');

  const invalid = baseState();
  const before = structuredClone(invalid);
  assert.throws(() => applyUpdatePlan(invalid, {
    planId: 'plan-active', now: '2026-07-24T13:00:00.000Z', createEventId: idFactory('event-invalid'), patch: { exerciseIds: [] },
  }), /activo no puede quedarse sin ejercicios/i);
  assert.deepEqual(invalid, before);
});

test('canonical plan membership add/remove/reorder enforces the same exercise invariants', () => {
  const state = baseState();
  state.plans[0].status = 'paused';
  const { applyPlanMembership } = planActions();
  let result = applyPlanMembership(state, { planId: 'plan-active', operation: 'add', exerciseIds: ['exercise-2', 'exercise-2'], now: '2026-07-24T13:00:00.000Z', createEventId: idFactory('event-add') });
  assert.deepEqual(result.plan.exerciseIds, ['exercise-1', 'exercise-2']);
  result = applyPlanMembership(state, { planId: 'plan-active', operation: 'reorder', exerciseIds: ['exercise-2', 'exercise-1'], now: '2026-07-24T13:05:00.000Z', createEventId: idFactory('event-reorder') });
  assert.deepEqual(result.plan.exerciseIds, ['exercise-2', 'exercise-1']);

  const active = baseState();
  const before = structuredClone(active);
  assert.throws(() => applyPlanMembership(active, { planId: 'plan-active', operation: 'remove', exerciseIds: ['exercise-1'], now: '2026-07-24T13:10:00.000Z', createEventId: idFactory('event-remove') }), /activo no puede quedarse sin ejercicios/i);
  assert.deepEqual(active, before);
});
