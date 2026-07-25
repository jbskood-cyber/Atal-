import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const patientCatalogQuery = () => loadCore('src/domain/queries/patientCatalog.js');

function stateFixture() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    patients: [
      { id: 'patient-1', name: 'Ana', diagnosis: 'Rodilla', age: 30, birthDate: '', sex: '', affectedArea: 'Rodilla', status: 'active', visitType: 'first', contact: { phone: '', email: '', address: '', emergencyContact: '' }, createdAt, updatedAt: createdAt },
      { id: 'patient-2', name: 'Luis', diagnosis: 'Hombro', age: 41, birthDate: '', sex: '', affectedArea: 'Hombro', status: 'active', visitType: 'followup', contact: { phone: '', email: '', address: '', emergencyContact: '' }, createdAt, updatedAt: createdAt },
    ],
    plans: [
      { id: 'plan-1', patientId: 'patient-1', title: 'Plan rodilla', focus: '', duration: '', frequency: '', goal: '', exerciseIds: [], status: 'active', progression: '', reportCriteria: '', generalInstructions: '', createdAt, updatedAt: createdAt },
      { id: 'plan-2', patientId: 'patient-2', title: 'Plan hombro', focus: '', duration: '', frequency: '', goal: '', exerciseIds: [], status: 'paused', progression: '', reportCriteria: '', generalInstructions: '', createdAt, updatedAt: createdAt },
    ],
    sessions: [
      { id: 'session-3', patientId: 'patient-1', planId: 'plan-1', startedAt: createdAt, completedAt: '2026-07-24T13:00:00.000Z', status: 'completed' },
      { id: 'session-2', patientId: 'patient-2', planId: 'plan-2', startedAt: createdAt, completedAt: '2026-07-24T12:00:00.000Z', status: 'completed' },
      { id: 'session-1', patientId: 'patient-1', planId: 'plan-1', startedAt: createdAt, completedAt: '2026-07-24T11:00:00.000Z', status: 'partial' },
    ],
  };
}

test('patient catalog builds reusable indexes without per-patient plan/session filtering', () => {
  const state = stateFixture();
  const { buildPatientCatalogIndex } = patientCatalogQuery();
  const index = buildPatientCatalogIndex(state);

  assert.equal(index.activePlanByPatient.get('patient-1')?.id, 'plan-1');
  assert.equal(index.activePlanByPatient.has('patient-2'), false);
  assert.deepEqual(index.sessionStatsByPlan.get('plan-1'), { total: 2, completed: 1 });
  assert.equal(index.latestSessionByPatient.get('patient-1')?.id, 'session-3');
  assert.equal(index.latestSessionByPatient.get('patient-2')?.id, 'session-2');
});

test('patient catalog preserves current plan, progress, adherence and latest-session semantics', () => {
  const state = stateFixture();
  const { buildPatientCatalog } = patientCatalogQuery();
  const views = buildPatientCatalog(state);

  const ana = views.find((item) => item.id === 'patient-1');
  const luis = views.find((item) => item.id === 'patient-2');

  assert.equal(ana.plan, 'Plan rodilla');
  assert.equal(ana.progress, 50);
  assert.equal(ana.adherence, 50);
  assert.match(ana.time, /24|jul/i);

  assert.equal(luis.plan, 'Sin plan activo');
  assert.equal(luis.progress, 0);
  assert.equal(luis.adherence, 0);
  assert.match(luis.time, /24|jul/i);
});

test('single-patient view reuses the same index and returns null for missing patients', () => {
  const state = stateFixture();
  const { buildPatientCatalogIndex, buildPatientView } = patientCatalogQuery();
  const index = buildPatientCatalogIndex(state);

  assert.equal(buildPatientView(state, 'patient-1', index)?.plan, 'Plan rodilla');
  assert.equal(buildPatientView(state, 'missing', index), null);
});
