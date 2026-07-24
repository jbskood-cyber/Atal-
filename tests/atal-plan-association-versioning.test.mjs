import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const planActions = () => loadCore('src/domain/actions/planActions.js');

function stateFixture() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2,
    seededAt: createdAt,
    updatedAt: createdAt,
    patients: [{ id: 'patient-1', name: 'Paciente', diagnosis: '', age: 30, birthDate: '', sex: '', affectedArea: '', status: 'active', visitType: 'first', contact: { phone: '', email: '', address: '', emergencyContact: '' }, createdAt, updatedAt: createdAt }],
    plans: [
      { id: 'plan-old', patientId: 'patient-1', title: 'Anterior', focus: '', duration: '', frequency: '', goal: '', exerciseIds: ['exercise-1'], status: 'active', progression: '', reportCriteria: '', generalInstructions: '', createdAt, updatedAt: createdAt },
      { id: 'plan-new', patientId: 'patient-1', title: 'Nuevo', focus: '', duration: '', frequency: '', goal: '', exerciseIds: ['exercise-1'], status: 'paused', progression: '', reportCriteria: '', generalInstructions: '', createdAt, updatedAt: createdAt },
    ],
    exercises: [{ id: 'exercise-1', name: 'Ejercicio', region: '', category: '', objective: '', startingPosition: '', instructions: [], precautions: '', equipment: '', difficulty: 'Inicial', sets: 1, repetitions: 1, rest: '', maxPain: 3, tags: [], notes: '', media: { type: 'none' }, status: 'active', source: 'local', createdAt, updatedAt: createdAt }],
    clinicalRecords: [{ id: 'record-1', patientId: 'patient-1', version: 3, date: createdAt, reasonForVisit: '', evolution: '', affectedArea: '', symptoms: [], painLevel: null, providedDiagnosis: '', functionalLimitations: [], goals: [], relevantHistory: [], precautions: [], clinicalNotes: '', planId: 'plan-old', professional: '', createdAt, updatedAt: createdAt }],
    clinicalRecordVersions: [], sessions: [], notes: [], events: [], notifications: [], feedback: [],
    settings: { notifications: true, haptics: true, compact: true, professionalName: '', specialty: '', clinic: '', sessionLock: true, clinicalPrivacy: true, aiSuggestions: true, aiAlerts: true, aiInstructions: '' },
  };
}

test('replacing the active plan versions the clinical record exactly once and preserves the prior association', () => {
  const state = stateFixture();
  const before = structuredClone(state.clinicalRecords[0]);
  const { applyPlanLifecycle } = planActions();
  const result = applyPlanLifecycle(state, {
    planId: 'plan-new',
    status: 'active',
    resolveActiveConflict: 'pause',
    now: '2026-07-24T17:00:00.000Z',
    createEventId: (() => { let index = 0; return () => `event-${index++}`; })(),
    createNotificationId: () => 'notification-1',
    createRecordVersionId: () => 'record-version-1',
  });

  assert.equal(result.plan.status, 'active');
  assert.equal(state.clinicalRecords[0].planId, 'plan-new');
  assert.equal(state.clinicalRecords[0].version, before.version + 1);
  assert.equal(state.clinicalRecords[0].createdAt, before.createdAt);
  assert.equal(state.clinicalRecordVersions.length, 1);
  assert.equal(state.clinicalRecordVersions[0].id, 'record-version-1');
  assert.equal(state.clinicalRecordVersions[0].recordId, before.id);
  assert.equal(state.clinicalRecordVersions[0].version, before.version);
  assert.deepEqual(state.clinicalRecordVersions[0].snapshot, before);
});

test('lifecycle changes that keep the same associated plan do not create empty clinical versions', () => {
  const state = stateFixture();
  const { applyPlanLifecycle } = planActions();
  applyPlanLifecycle(state, {
    planId: 'plan-old',
    status: 'paused',
    now: '2026-07-24T17:05:00.000Z',
    createEventId: () => 'event-paused',
    createNotificationId: () => 'notification-unused',
    createRecordVersionId: () => 'record-version-should-not-exist',
  });
  assert.equal(state.clinicalRecords[0].planId, 'plan-old');
  assert.equal(state.clinicalRecords[0].version, 3);
  assert.equal(state.clinicalRecordVersions.length, 0);
});
