import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const { executeToolInvocation } = loadCore('src/features/atal-ai/core/executionEngine.js');
const { executeUndo } = loadCore('src/features/atal-ai/core/undoEngine.js');

const FIXED = '2026-07-21T18:00:00.000Z';

function baseState() {
  return {
    version: 2,
    seededAt: FIXED,
    updatedAt: FIXED,
    patients: [{ id: 'patient-1', name: 'Ana López', diagnosis: 'Dolor lumbar', age: 40, birthDate: '', sex: '', affectedArea: 'Lumbar', status: 'active', visitType: 'followup', contact: { phone: '', email: '', address: '', emergencyContact: '' }, createdAt: FIXED, updatedAt: FIXED }],
    plans: [
      { id: 'plan-1', patientId: 'patient-1', title: 'Plan activo', focus: '', duration: '4 semanas', frequency: '3 veces por semana', goal: '', exerciseIds: [], status: 'active', progression: '', reportCriteria: '', generalInstructions: '', createdAt: FIXED, updatedAt: FIXED },
      { id: 'plan-2', patientId: 'patient-1', title: 'Plan nuevo', focus: '', duration: '6 semanas', frequency: '4 veces por semana', goal: '', exerciseIds: [], status: 'draft', progression: '', reportCriteria: '', generalInstructions: '', createdAt: FIXED, updatedAt: FIXED },
    ],
    exercises: [], clinicalRecords: [], clinicalRecordVersions: [], sessions: [], notes: [], events: [], notifications: [],
    settings: { notifications: true, haptics: true, compact: true, professionalName: '', specialty: '', clinic: '', sessionLock: true, clinicalPrivacy: true, aiSuggestions: true, aiAlerts: true, aiInstructions: '' },
    feedback: [],
  };
}

function memoryPort() {
  let state = structuredClone(baseState());
  let mutations = 0;
  return {
    read: () => structuredClone(state),
    replace: (next) => { state = structuredClone(next); mutations += 1; },
    mutationCount: () => mutations,
  };
}

function context(overrides = {}) {
  return {
    now: FIXED,
    actor: { id: 'owner-1', role: 'owner' },
    source: 'ai',
    conversationId: 'conversation-1',
    draftId: 'draft-1',
    workContext: { intent: 'update_patient_record', patientMode: 'existing', selectedPatientId: '', selectedPlanId: '', selectedExerciseId: '' },
    metadata: { conversationId: 'conversation-1', draftId: 'draft-1' },
    ...overrides,
  };
}

function invocation(tool, input, references = []) {
  return { proposalId: `proposal-${tool}`, tool, version: 1, input, references, authorization: 'explicit-user-request' };
}

function proof(inv, mode = 'review') {
  const { fingerprintInvocation } = loadCore('src/features/atal-ai/core/stableValue.js');
  return { id: 'confirmation-1', fingerprint: fingerprintInvocation(inv), mode, confirmedAt: FIXED, expiresAt: '2026-07-21T18:05:00.000Z' };
}

function execute(port, inv, confirmation) {
  return executeToolInvocation({ invocation: inv, context: context(), confirmation }, { port });
}

test('patient.create creates patient, record and optional plan atomically', () => {
  const port = memoryPort();
  const inv = invocation('patient.create', {
    patient: { name: 'Luis Méndez', diagnosis: 'Rodilla', phone: '4441234567' },
    record: { reasonForVisit: 'Dolor al correr', painLevel: 6 },
    plan: { title: 'Plan rodilla', duration: '6 semanas', frequency: '3 veces por semana', status: 'active' },
  });
  const result = execute(port, inv, proof(inv, 'explicit'));
  assert.equal(result.status, 'success', JSON.stringify(result));
  const state = port.read();
  assert.equal(state.patients.length, 2);
  const patient = state.patients.find((item) => item.name === 'Luis Méndez');
  assert.ok(patient);
  assert.ok(state.clinicalRecords.some((item) => item.patientId === patient.id));
  assert.ok(state.plans.some((item) => item.patientId === patient.id && item.title === 'Plan rodilla'));
  assert.ok(result.undo);
});

test('patient.update, note add and plan create are reversible canonical writes', () => {
  const port = memoryPort();
  const patientUpdate = invocation('patient.update', { patient: { type: 'patient', id: 'patient-1' }, patch: { contact: { phone: '4449990000' } } }, [{ type: 'patient', id: 'patient-1' }]);
  const updated = execute(port, patientUpdate, proof(patientUpdate));
  assert.equal(updated.status, 'success', JSON.stringify(updated));
  assert.equal(port.read().patients[0].contact.phone, '4449990000');
  executeUndo(updated.undo, context({ now: '2026-07-21T18:00:10.000Z' }), port);
  assert.equal(port.read().patients[0].contact.phone, '');

  const note = invocation('patient_note.add', { patient: { type: 'patient', id: 'patient-1' }, content: 'Tolera mejor la marcha.' }, [{ type: 'patient', id: 'patient-1' }]);
  const noteResult = execute(port, note, proof(note));
  assert.equal(noteResult.status, 'success', JSON.stringify(noteResult));
  assert.equal(port.read().notes.length, 1);

  const createPlan = invocation('plan.create_simple', { patient: { type: 'patient', id: 'patient-1' }, title: 'Plan IA', status: 'draft' }, [{ type: 'patient', id: 'patient-1' }]);
  const planResult = execute(port, createPlan, proof(createPlan));
  assert.equal(planResult.status, 'success', JSON.stringify(planResult));
  assert.ok(port.read().plans.some((item) => item.title === 'Plan IA'));
});

test('replace active changes two plans atomically and undo restores both', () => {
  const port = memoryPort();
  const inv = invocation('plan.replace_active', { patient: { type: 'patient', id: 'patient-1' }, targetPlan: { type: 'plan', id: 'plan-2' }, replaceCurrent: true }, [
    { type: 'patient', id: 'patient-1' },
    { type: 'plan', id: 'plan-2' },
  ]);
  const gate = execute(port, inv);
  assert.equal(gate.status, 'confirmation-required');
  const current = gate.invocation;
  const result = execute(port, current, proof(current, 'explicit'));
  assert.equal(result.status, 'success', JSON.stringify(result));
  assert.deepEqual(port.read().plans.map((item) => [item.id, item.status]), [['plan-1', 'paused'], ['plan-2', 'active']]);
  executeUndo(result.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.deepEqual(port.read().plans.map((item) => [item.id, item.status]), [['plan-1', 'active'], ['plan-2', 'draft']]);
});

test('settings rejects unknown keys and export returns a client descriptor without DOM or network after explicit confirmation', () => {
  const port = memoryPort();
  const invalidSettings = invocation('settings.update', { patch: { professionalName: 'No permitido' } }, [{ type: 'settings' }]);
  const invalid = execute(port, invalidSettings, proof(invalidSettings));
  assert.equal(invalid.status, 'error');
  assert.equal(invalid.code, 'CORE_INPUT_INVALID');

  const exportInvocation = invocation('data.export_local', { kind: 'patients' });
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = () => { networkCalls += 1; throw new Error('network forbidden'); };
  try {
    const gate = execute(port, exportInvocation);
    assert.equal(gate.status, 'confirmation-required');
    const result = execute(port, gate.invocation, proof(gate.invocation, 'explicit'));
    assert.equal(result.status, 'success');
    assert.equal(result.clientEffect.type, 'download');
    assert.match(result.clientEffect.filename, /atal-pacientes/);
    assert.equal(networkCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reserved destructive and external capabilities are deterministically blocked', () => {
  const port = memoryPort();
  for (const tool of ['patient.delete_permanently', 'plan.delete_permanently', 'message.send_patient', 'email.send_report', 'cloud.sync']) {
    const result = execute(port, invocation(tool, {}));
    assert.equal(result.status, 'blocked', tool);
  }
  assert.equal(port.mutationCount(), 0);
});
