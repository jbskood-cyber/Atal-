import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const homeQuery = () => loadCore('src/domain/queries/homeDashboard.js');

function fixture() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    patients: [
      { id: 'patient-1', name: 'Ana', diagnosis: 'Rodilla', status: 'active' },
      { id: 'patient-2', name: 'Luis', diagnosis: 'Hombro', status: 'active' },
      { id: 'patient-3', name: 'Eva', diagnosis: 'Tobillo', status: 'archived' },
    ],
    plans: [
      { id: 'plan-1', patientId: 'patient-1', status: 'active' },
      { id: 'plan-2', patientId: 'patient-2', status: 'archived' },
    ],
    sessions: [
      { id: 'session-1', patientId: 'patient-1', planId: 'plan-1', completedAt: '2026-07-24T13:00:00.000Z', reviewedAt: undefined, endPain: 8, symptoms: ['mareo'], status: 'completed' },
      { id: 'session-2', patientId: 'patient-2', planId: 'plan-2', completedAt: '2026-07-24T12:00:00.000Z', reviewedAt: '2026-07-24T12:30:00.000Z', endPain: 2, symptoms: ['ninguno'], status: 'completed' },
      { id: 'session-3', patientId: 'patient-1', planId: 'plan-1', completedAt: '2026-07-24T11:00:00.000Z', reviewedAt: undefined, endPain: 3, symptoms: ['ninguno'], status: 'partial' },
    ],
  };
}

test('home dashboard derives counts and alerts from one indexed pass', () => {
  const { buildHomeDashboard } = homeQuery();
  const result = buildHomeDashboard(fixture());

  assert.equal(result.activePatientCount, 2);
  assert.equal(result.activePlanCount, 1);
  assert.equal(result.pendingReportCount, 2);
  assert.deepEqual(result.recentReports.map((item) => item.id), ['session-1', 'session-2', 'session-3']);
  assert.equal(result.patientsWithoutPlan.length, 1);
  assert.equal(result.patientsWithoutPlan[0].id, 'patient-2');
  assert.equal(result.patientById.get('patient-1')?.name, 'Ana');
});

test('home dashboard keeps pending reports newest-first and preserves urgency semantics', () => {
  const { buildHomeDashboard } = homeQuery();
  const result = buildHomeDashboard(fixture());

  assert.deepEqual(result.pendingReports.map((item) => item.id), ['session-1', 'session-3']);
  assert.equal(result.pendingReports[0].urgent, true);
  assert.equal(result.pendingReports[1].urgent, false);
});
