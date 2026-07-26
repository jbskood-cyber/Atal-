import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const planActions = () => loadCore('src/domain/actions/planActions.js');
const planExerciseTools = () => loadCore('src/features/atal-ai/core/tools/universalPlanExerciseTools.js');

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

test('AI plan create/update/membership produce the canonical record association and activity events', () => {
  const { universalPlanExerciseTools } = planExerciseTools();
  const createTool = universalPlanExerciseTools.find((tool) => tool.name === 'plan.create_simple');
  const updateTool = universalPlanExerciseTools.find((tool) => tool.name === 'plan.update_fields');
  const membershipTool = universalPlanExerciseTools.find((tool) => tool.name === 'plan.membership');
  assert.ok(createTool && updateTool && membershipTool);

  const state = baseState();
  state.plans[0].status = 'paused';
  state.clinicalRecords[0].planId = '';
  const patient = state.patients[0];
  const createEnvironment = {
    state,
    resolved: { patient },
    transactionId: 'tx-create',
    context: { now: '2026-07-24T14:00:00.000Z' },
  };
  const createInput = createTool.validateInput({
    patient: { type: 'patient', id: patient.id },
    title: ' Plan IA ', focus: ' Fuerza ', duration: '6 semanas', frequency: '4 días', goal: 'Mejorar fuerza', exerciseIds: ['exercise-1', 'exercise-1'], status: 'draft', progression: '', reportCriteria: '', generalInstructions: '',
  });
  createTool.preconditions(createEnvironment, createInput);
  const created = createTool.execute(createEnvironment, createInput);
  assert.equal(created.data.planId, 'tx-create-plan');
  assert.equal(state.clinicalRecords[0].planId, 'tx-create-plan');
  assert.equal(state.events[0].kind, 'plan_created');
  assert.equal(state.plans.at(-1).title, 'Plan IA');
  assert.deepEqual(state.plans.at(-1).exerciseIds, ['exercise-1']);

  const plan = state.plans.at(-1);
  const updateEnvironment = {
    state,
    resolved: { plan },
    transactionId: 'tx-update',
    context: { now: '2026-07-24T14:05:00.000Z' },
  };
  const updateInput = updateTool.validateInput({ plan: { type: 'plan', id: plan.id }, patch: { title: ' Plan IA editado ' } });
  updateTool.preconditions(updateEnvironment, updateInput);
  updateTool.execute(updateEnvironment, updateInput);
  assert.equal(plan.title, 'Plan IA editado');
  assert.equal(state.events[0].kind, 'plan_updated');

  const membershipEnvironment = {
    state,
    resolved: { plan },
    transactionId: 'tx-membership',
    context: { now: '2026-07-24T14:10:00.000Z' },
  };
  const membershipInput = membershipTool.validateInput({ plan: { type: 'plan', id: plan.id }, operation: 'add', exerciseIds: ['exercise-2', 'exercise-2'] });
  membershipTool.preconditions(membershipEnvironment, membershipInput);
  membershipTool.execute(membershipEnvironment, membershipInput);
  assert.deepEqual(plan.exerciseIds, ['exercise-1', 'exercise-2']);
  assert.equal(state.events[0].kind, 'plan_updated');
});

test('canonical plan lifecycle enforces allowed transitions and syncs record association', () => {
  const { applyPlanLifecycle } = planActions();
  const state = baseState();
  state.plans[0].status = 'draft';
  state.clinicalRecords[0].planId = '';
  const activated = applyPlanLifecycle(state, { planId: 'plan-active', status: 'active', now: '2026-07-24T15:00:00.000Z', createEventId: idFactory('event-active'), createNotificationId: idFactory('notification-active') });
  assert.equal(activated.plan.status, 'active');
  assert.equal(state.events[0].kind, 'plan_activated');
  assert.equal(state.notifications[0].href, '/plans/plan-active');
  assert.equal(state.clinicalRecords[0].planId, 'plan-active');

  const paused = applyPlanLifecycle(state, { planId: 'plan-active', status: 'paused', now: '2026-07-24T15:05:00.000Z', createEventId: idFactory('event-paused'), createNotificationId: idFactory('notification-unused') });
  assert.equal(paused.plan.status, 'paused');
  assert.equal(state.events[0].kind, 'plan_paused');

  const completed = applyPlanLifecycle(state, { planId: 'plan-active', status: 'completed', now: '2026-07-24T15:10:00.000Z', createEventId: idFactory('event-completed'), createNotificationId: idFactory('notification-unused') });
  assert.equal(completed.plan.status, 'completed');
  assert.equal(state.events[0].kind, 'plan_completed');

  const archived = applyPlanLifecycle(state, { planId: 'plan-active', status: 'archived', now: '2026-07-24T15:15:00.000Z', createEventId: idFactory('event-archived'), createNotificationId: idFactory('notification-unused') });
  assert.equal(archived.plan.status, 'archived');
  assert.equal(state.events[0].kind, 'plan_archived');

  const restored = applyPlanLifecycle(state, { planId: 'plan-active', status: 'draft', now: '2026-07-24T15:20:00.000Z', createEventId: idFactory('event-restored'), createNotificationId: idFactory('notification-unused') });
  assert.equal(restored.plan.status, 'draft');
  assert.equal(state.events[0].kind, 'plan_restored');
});

test('canonical plan lifecycle rejects illegal transitions and active plans without exercises atomically', () => {
  const { applyPlanLifecycle } = planActions();
  const illegal = baseState();
  illegal.plans[0].status = 'draft';
  const illegalBefore = structuredClone(illegal);
  assert.throws(() => applyPlanLifecycle(illegal, { planId: 'plan-active', status: 'completed', now: '2026-07-24T16:00:00.000Z', createEventId: idFactory('event'), createNotificationId: idFactory('notification') }), /transición.*no.*permitida/i);
  assert.deepEqual(illegal, illegalBefore);

  const noExercises = baseState();
  noExercises.plans[0].status = 'paused';
  noExercises.plans[0].exerciseIds = [];
  const noExercisesBefore = structuredClone(noExercises);
  assert.throws(() => applyPlanLifecycle(noExercises, { planId: 'plan-active', status: 'active', now: '2026-07-24T16:05:00.000Z', createEventId: idFactory('event'), createNotificationId: idFactory('notification') }), /activo necesita al menos un ejercicio/i);
  assert.deepEqual(noExercises, noExercisesBefore);
});

test('canonical activation rejects active conflict unless an explicit resolution is supplied', () => {
  const { applyPlanLifecycle } = planActions();
  const state = baseState();
  state.plans.push({ ...state.plans[0], id: 'plan-target', title: 'Plan objetivo', status: 'paused', exerciseIds: ['exercise-2'] });
  const before = structuredClone(state);
  assert.throws(() => applyPlanLifecycle(state, { planId: 'plan-target', status: 'active', now: '2026-07-24T16:10:00.000Z', createEventId: idFactory('event'), createNotificationId: idFactory('notification') }), /plan activo/i);
  assert.deepEqual(state, before);
});

test('canonical active replacement resolves previous plan, activates target, syncs record and audits both transitions', () => {
  const { applyPlanLifecycle } = planActions();
  for (const resolution of ['pause', 'complete', 'archive']) {
    const state = baseState();
    state.plans.push({ ...state.plans[0], id: 'plan-target', title: 'Plan objetivo', status: 'paused', exerciseIds: ['exercise-2'] });
    const result = applyPlanLifecycle(state, {
      planId: 'plan-target', status: 'active', resolveActiveConflict: resolution,
      now: '2026-07-24T16:20:00.000Z', createEventId: idFactory('event-previous', 'event-target'), createNotificationId: idFactory('notification-target'),
    });
    const previous = state.plans.find((plan) => plan.id === 'plan-active');
    assert.equal(previous.status, resolution === 'complete' ? 'completed' : resolution === 'archive' ? 'archived' : 'paused');
    assert.equal(result.plan.status, 'active');
    assert.equal(state.events.length, 2);
    assert.equal(state.events[0].kind, 'plan_activated');
    assert.equal(state.events[1].kind, resolution === 'complete' ? 'plan_completed' : resolution === 'archive' ? 'plan_archived' : 'plan_paused');
    assert.equal(state.clinicalRecords[0].planId, 'plan-target');
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].href, '/plans/plan-target');
  }
});
