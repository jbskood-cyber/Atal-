import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const sessionActions = () => loadCore('src/domain/actions/sessionActions.js');

function baseState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2,
    seededAt: createdAt,
    updatedAt: createdAt,
    patients: [{
      id: 'patient-1', name: 'Paciente', diagnosis: 'Rodilla', age: 30, birthDate: '', sex: '', affectedArea: 'Rodilla', status: 'active', visitType: 'followup', contact: { phone: '', email: '', address: '', emergencyContact: '' }, createdAt, updatedAt: createdAt,
    }],
    plans: [{
      id: 'plan-1', patientId: 'patient-1', title: 'Plan', focus: '', duration: '', frequency: '', goal: '', exerciseIds: [], status: 'active', progression: '', reportCriteria: '', generalInstructions: '', createdAt, updatedAt: createdAt,
    }],
    exercises: [], clinicalRecords: [], clinicalRecordVersions: [], notes: [],
    sessions: [{
      id: 'session-1', patientId: 'patient-1', planId: 'plan-1', startedAt: createdAt, completedAt: '2026-07-24T10:30:00.000Z', status: 'completed', startPain: 3, startEnergy: 7, startComment: '', exercises: [], endPain: 4, endEnergy: 6, effort: 5, symptoms: [], comment: '', easiest: '', hardest: '', discomfort: '', durationMinutes: 30, clinicalObservation: '', createdAt, updatedAt: createdAt,
    }],
    events: [],
    notifications: [
      { id: 'notification-session', title: 'Sesión lista para revisar', detail: 'Paciente', severity: 'attention', href: '/activity/session-1', read: false, createdAt },
      { id: 'notification-other', title: 'Otra', detail: 'Otra', severity: 'stable', href: '/activity/session-2', read: false, createdAt },
    ],
    settings: { notifications: true, haptics: true, compact: true, professionalName: 'Fisio', specialty: 'Fisioterapia', clinic: '', sessionLock: true, clinicalPrivacy: true, aiSuggestions: true, aiAlerts: true, aiInstructions: '' },
    feedback: [],
  };
}

function eventIds(...ids) {
  let index = 0;
  return () => ids[index++] ?? `event-${index}`;
}

test('canonical session review updates the report, marks its notification read and emits one shared event', () => {
  const state = baseState();
  const { applyReviewSession } = sessionActions();
  const original = structuredClone(state.sessions[0]);

  const result = applyReviewSession(state, {
    sessionId: 'session-1',
    observation: '  Buena tolerancia; progresar carga.  ',
    now: '2026-07-24T12:00:00.000Z',
    createEventId: eventIds('event-review'),
  });

  assert.equal(result.session.id, original.id);
  assert.equal(result.session.createdAt, original.createdAt);
  assert.equal(result.session.startedAt, original.startedAt);
  assert.equal(result.session.completedAt, original.completedAt);
  assert.equal(result.session.clinicalObservation, 'Buena tolerancia; progresar carga.');
  assert.equal(result.session.reviewedAt, '2026-07-24T12:00:00.000Z');
  assert.equal(result.session.updatedAt, '2026-07-24T12:00:00.000Z');
  assert.equal(state.notifications.find((item) => item.id === 'notification-session').read, true);
  assert.equal(state.notifications.find((item) => item.id === 'notification-other').read, false);
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].id, 'event-review');
  assert.equal(state.events[0].kind, 'report_reviewed');
  assert.equal(state.events[0].patientId, 'patient-1');
  assert.equal(state.events[0].planId, 'plan-1');
  assert.equal(state.events[0].sessionId, 'session-1');
  assert.equal(state.events[0].detail, 'Buena tolerancia; progresar carga.');
});

test('canonical session review allows empty observation while still marking the report reviewed', () => {
  const state = baseState();
  const { applyReviewSession } = sessionActions();
  const result = applyReviewSession(state, {
    sessionId: 'session-1', observation: '   ', now: '2026-07-24T12:05:00.000Z', createEventId: eventIds('event-empty'),
  });
  assert.equal(result.session.clinicalObservation, '');
  assert.equal(result.session.reviewedAt, '2026-07-24T12:05:00.000Z');
  assert.equal(state.events[0].detail, 'Sin observación adicional');
  assert.equal(state.notifications.find((item) => item.id === 'notification-session').read, true);
});

test('canonical session review rejects observations over 2000 characters atomically', () => {
  const state = baseState();
  const before = structuredClone(state);
  const { applyReviewSession } = sessionActions();
  assert.throws(() => applyReviewSession(state, {
    sessionId: 'session-1', observation: 'x'.repeat(2001), now: '2026-07-24T12:10:00.000Z', createEventId: eventIds('event-too-long'),
  }), /2000 caracteres/i);
  assert.deepEqual(state, before);
});

test('canonical session review rejects a missing session with zero mutation', () => {
  const state = baseState();
  const before = structuredClone(state);
  const { applyReviewSession } = sessionActions();

  assert.throws(() => applyReviewSession(state, {
    sessionId: 'missing', observation: 'Revisado', now: '2026-07-24T12:00:00.000Z', createEventId: eventIds('event-review'),
  }), /sesión (ya no existe|no encontrada)/i);
  assert.deepEqual(state, before);
});
