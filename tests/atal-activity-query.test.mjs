import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const activityQuery = () => loadCore('src/domain/queries/activityIndex.js');

function fixture() {
  return {
    patients: [
      { id: 'patient-1', name: 'Ana', diagnosis: 'Rodilla' },
      { id: 'patient-2', name: 'Luis', diagnosis: 'Hombro' },
    ],
    plans: [
      { id: 'plan-1', patientId: 'patient-1', title: 'Plan rodilla' },
      { id: 'plan-2', patientId: 'patient-2', title: 'Plan hombro' },
    ],
    events: [
      { id: 'event-1', patientId: 'patient-1', planId: 'plan-1', title: 'Plan actualizado', detail: 'Frecuencia cambiada', createdAt: '2026-07-24T13:00:00.000Z' },
      { id: 'event-2', patientId: 'patient-2', planId: 'plan-2', title: 'Paciente creado', detail: 'Alta inicial', createdAt: '2026-07-24T12:00:00.000Z' },
    ],
  };
}

test('activity index builds patient and plan maps once', () => {
  const { buildActivityIndex } = activityQuery();
  const index = buildActivityIndex(fixture());
  assert.equal(index.patientById.get('patient-1')?.name, 'Ana');
  assert.equal(index.planById.get('plan-2')?.title, 'Plan hombro');
});

test('activity timeline preserves filtering, search and newest-first semantics', () => {
  const { buildActivityIndex, filterActivityTimeline } = activityQuery();
  const state = fixture();
  const index = buildActivityIndex(state);

  assert.deepEqual(filterActivityTimeline(state.events, index, '', '').map((item) => item.id), ['event-1', 'event-2']);
  assert.deepEqual(filterActivityTimeline(state.events, index, 'patient-1', '').map((item) => item.id), ['event-1']);
  assert.deepEqual(filterActivityTimeline(state.events, index, '', 'hombro').map((item) => item.id), ['event-2']);
  assert.deepEqual(filterActivityTimeline(state.events, index, '', 'frecuencia').map((item) => item.id), ['event-1']);
});
