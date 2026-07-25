import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { loadCore } from './helpers/core-modules.mjs';

const homeQuery = () => loadCore('src/domain/queries/homeDashboard.js');
const patientQuery = () => loadCore('src/domain/queries/patientCatalog.js');
const activityQuery = () => loadCore('src/domain/queries/activityIndex.js');

function largeFixture(size = 4_000) {
  const patients = Array.from({ length: size }, (_, index) => ({
    id: `patient-${index}`,
    name: `Paciente ${index}`,
    diagnosis: index % 2 ? 'Hombro' : 'Rodilla',
    age: 30,
    birthDate: '',
    sex: '',
    affectedArea: index % 2 ? 'Hombro' : 'Rodilla',
    status: 'active',
    visitType: 'followup',
    contact: { phone: '', email: '', address: '', emergencyContact: '' },
    createdAt: '2026-07-24T10:00:00.000Z',
    updatedAt: '2026-07-24T10:00:00.000Z',
  }));
  const plans = patients.map((patient, index) => ({
    id: `plan-${index}`,
    patientId: patient.id,
    title: `Plan ${index}`,
    focus: '',
    duration: '4 semanas',
    frequency: '3 días',
    goal: '',
    exerciseIds: [],
    status: 'active',
    progression: '',
    reportCriteria: '',
    generalInstructions: '',
    createdAt: '2026-07-24T10:00:00.000Z',
    updatedAt: '2026-07-24T10:00:00.000Z',
  }));
  const sessions = patients.map((patient, index) => ({
    id: `session-${index}`,
    patientId: patient.id,
    planId: `plan-${index}`,
    planSnapshot: null,
    status: 'completed',
    startedAt: '2026-07-24T10:00:00.000Z',
    completedAt: `2026-07-24T${String(10 + (index % 10)).padStart(2, '0')}:00:00.000Z`,
    startPain: 3,
    endPain: 2,
    effort: 5,
    symptoms: [],
    notes: '',
    exerciseResults: [],
    reviewedAt: '',
    reviewNote: '',
    createdAt: '2026-07-24T10:00:00.000Z',
    updatedAt: '2026-07-24T10:00:00.000Z',
  }));
  const events = patients.map((patient, index) => ({
    id: `event-${index}`,
    patientId: patient.id,
    planId: `plan-${index}`,
    title: 'Plan actualizado',
    detail: index % 2 ? 'Hombro' : 'Frecuencia cambiada',
    origin: 'manual',
    createdAt: `2026-07-24T${String(10 + (index % 10)).padStart(2, '0')}:00:00.000Z`,
  }));
  return { patients, plans, sessions, events };
}

test('derived clinical queries stay responsive on a large local dataset', () => {
  const state = largeFixture();
  const { buildHomeDashboard } = homeQuery();
  const { buildPatientCatalog } = patientQuery();
  const { buildActivityIndex, filterActivityTimeline } = activityQuery();

  const started = performance.now();
  const dashboard = buildHomeDashboard(state);
  const catalog = buildPatientCatalog(state);
  const activityIndex = buildActivityIndex(state);
  const timeline = filterActivityTimeline(state.events, activityIndex, '', 'frecuencia');
  const elapsedMs = performance.now() - started;

  assert.equal(dashboard.activePatientCount, state.patients.length);
  assert.equal(catalog.length, state.patients.length);
  assert.equal(timeline.length, state.events.length / 2);
  assert.ok(elapsedMs < 5_000, `Derived query hot paths took ${elapsedMs.toFixed(1)}ms for ${state.patients.length} patients; expected < 5000ms.`);
});
