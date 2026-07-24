import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const actionTransactions = () => loadCore('src/domain/actions/actionTransaction.js');

function makeState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2,
    seededAt: createdAt,
    updatedAt: createdAt,
    patients: [{
      id: 'patient-1',
      name: 'Paciente prueba',
      diagnosis: 'Dolor de rodilla',
      age: 32,
      birthDate: '',
      sex: '',
      affectedArea: 'Rodilla',
      status: 'active',
      visitType: 'followup',
      contact: { phone: '', email: '', address: '', emergencyContact: '' },
      createdAt,
      updatedAt: createdAt,
    }],
    plans: [
      {
        id: 'active-plan',
        patientId: 'patient-1',
        title: 'Plan activo',
        focus: 'Movilidad',
        duration: '4 semanas',
        frequency: '3 días por semana',
        goal: 'Recuperar función',
        exerciseIds: ['exercise-1'],
        status: 'active',
        progression: '',
        reportCriteria: '',
        generalInstructions: '',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'draft-plan',
        patientId: 'patient-1',
        title: 'Plan borrador',
        focus: 'Fuerza',
        duration: 'Por definir',
        frequency: 'Por definir',
        goal: '',
        exerciseIds: [],
        status: 'draft',
        progression: '',
        reportCriteria: '',
        generalInstructions: '',
        createdAt,
        updatedAt: createdAt,
      },
    ],
    exercises: [{
      id: 'exercise-1',
      name: 'Extensión de rodilla',
      region: 'Rodilla',
      category: 'Movilidad',
      objective: '',
      startingPosition: '',
      instructions: [],
      precautions: '',
      equipment: '',
      difficulty: 'Inicial',
      sets: 3,
      repetitions: 10,
      rest: '',
      maxPain: 3,
      tags: [],
      notes: '',
      media: { type: 'none' },
      status: 'active',
      source: 'local',
      createdAt,
      updatedAt: createdAt,
    }],
    clinicalRecords: [],
    clinicalRecordVersions: [],
    sessions: [],
    notes: [],
    events: [],
    notifications: [],
    settings: {
      notifications: true,
      haptics: true,
      compact: true,
      professionalName: 'Fisio prueba',
      specialty: 'Fisioterapia',
      clinic: '',
      sessionLock: true,
      clinicalPrivacy: true,
      aiSuggestions: true,
      aiAlerts: true,
      aiInstructions: '',
    },
    feedback: [],
  };
}

function memoryPort(initial) {
  let current = structuredClone(initial);
  return {
    read() { return current; },
    mutate(mutator) {
      const candidate = structuredClone(current);
      mutator(candidate);
      current = candidate;
    },
    snapshot() { return structuredClone(current); },
  };
}

test('shared transaction rejects an affected entity that does not exist after mutation', () => {
  const initial = makeState();
  const port = memoryPort(initial);
  const { executeActionTransaction } = actionTransactions();

  assert.throws(() => executeActionTransaction({
    action: 'patient.update',
    now: '2026-07-24T16:00:00.000Z',
    origin: { type: 'manual-ui' },
    supportsUndo: true,
    mutate() {
      return {
        status: 'success',
        message: 'Cambio aplicado.',
        summary: [],
        affected: [{ type: 'patient', id: 'patient-missing' }],
      };
    },
  }, port), /entidad afectada no existe/i);

  assert.deepEqual(port.snapshot(), initial);
});

test('shared transaction rejects deletion of an existing entity even when undo is not exposed', () => {
  const initial = makeState();
  const port = memoryPort(initial);
  const { executeActionTransaction } = actionTransactions();

  assert.throws(() => executeActionTransaction({
    action: 'plan.delete',
    now: '2026-07-24T16:10:00.000Z',
    origin: { type: 'system' },
    supportsUndo: false,
    mutate(state) {
      state.plans = state.plans.filter((plan) => plan.id !== 'draft-plan');
      return {
        status: 'success',
        message: 'Plan eliminado.',
        summary: [],
        affected: [{ type: 'plan', id: 'draft-plan' }],
      };
    },
  }, port), /eliminó una entidad existente/i);

  assert.deepEqual(port.snapshot(), initial);
});

test('shared transaction supports a caller-specific transaction id prefix', () => {
  const port = memoryPort(makeState());
  const { executeActionTransaction } = actionTransactions();

  const outcome = executeActionTransaction({
    action: 'patient.read-model-touch',
    now: '2026-07-24T16:20:00.000Z',
    origin: { type: 'atal-ai-general' },
    transactionIdPrefix: 'ai-transaction',
    supportsUndo: false,
    mutate() {
      return {
        status: 'success',
        message: 'Sin cambios clínicos.',
        summary: [],
        affected: [{ type: 'patient', id: 'patient-1' }],
      };
    },
  }, port);

  assert.match(outcome.transactionId, /^ai-transaction-/);
});

test('settings undo stores only the fields changed by the transaction', () => {
  const port = memoryPort(makeState());
  const { executeActionTransaction } = actionTransactions();

  const outcome = executeActionTransaction({
    action: 'settings.update',
    now: '2026-07-24T16:30:00.000Z',
    origin: { type: 'manual-ui' },
    supportsUndo: true,
    mutate(state) {
      state.settings.haptics = false;
      return {
        status: 'success',
        message: 'Ajustes actualizados.',
        summary: [],
        affected: [{ type: 'settings', id: 'settings' }],
      };
    },
  }, port);

  const patch = outcome.undo.patches.find((item) => item.operation === 'restore' && item.collection === 'settings');
  assert.ok(patch);
  assert.deepEqual(Object.keys(patch.before).sort(), ['haptics']);
  assert.equal(patch.before.haptics, true);
});
