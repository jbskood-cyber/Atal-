import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const patientTools = () => loadCore('src/features/atal-ai/core/tools/universalPatientTools.js');
const actionTransactions = () => loadCore('src/domain/actions/actionTransaction.js');

function makeState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2,
    seededAt: createdAt,
    updatedAt: createdAt,
    patients: [
      {
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
      },
    ],
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
    exercises: [
      {
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
      },
    ],
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

function context(now) {
  return {
    conversationId: 'conversation-1',
    draftId: 'draft-1',
    route: '/patients/patient-1',
    selectedPatientId: 'patient-1',
    selectedPlanId: '',
    selectedExerciseId: '',
    selectedSessionId: '',
    assistantScope: 'global',
    now,
  };
}

function memoryPort(initial) {
  let current = structuredClone(initial);
  return {
    read() {
      return current;
    },
    mutate(mutator) {
      const candidate = structuredClone(current);
      mutator(candidate);
      current = candidate;
    },
    snapshot() {
      return structuredClone(current);
    },
  };
}

test('patient.lifecycle archive preserves the manual invariant by pausing active plans', () => {
  const state = makeState();
  const lifecycle = patientTools().universalPatientTools.find((tool) => tool.name === 'patient.lifecycle');
  assert.ok(lifecycle, 'patient.lifecycle tool must exist');

  const now = '2026-07-24T12:00:00.000Z';
  const patient = state.patients[0];
  const result = lifecycle.execute(
    {
      state,
      context: context(now),
      resolved: { patient },
      transactionId: 'tx-patient-lifecycle',
    },
    { patient: { type: 'patient', id: patient.id }, archived: true },
  );

  assert.equal(patient.status, 'archived');
  assert.equal(patient.updatedAt, now);
  assert.equal(state.plans.find((plan) => plan.id === 'active-plan').status, 'paused');
  assert.equal(state.plans.find((plan) => plan.id === 'active-plan').updatedAt, now);
  assert.equal(state.plans.find((plan) => plan.id === 'draft-plan').status, 'draft');
  assert.equal(state.events.filter((event) => event.kind === 'plan_paused').length, 1);
  assert.ok(result.affected.some((entity) => entity.type === 'plan' && entity.id === 'active-plan'));
});

test('patient.lifecycle restore does not silently reactivate plans', () => {
  const state = makeState();
  state.patients[0].status = 'archived';
  state.plans[0].status = 'paused';
  const lifecycle = patientTools().universalPatientTools.find((tool) => tool.name === 'patient.lifecycle');
  const now = '2026-07-24T13:00:00.000Z';

  lifecycle.execute(
    {
      state,
      context: context(now),
      resolved: { patient: state.patients[0] },
      transactionId: 'tx-patient-restore',
    },
    { patient: { type: 'patient', id: 'patient-1' }, archived: false },
  );

  assert.equal(state.patients[0].status, 'active');
  assert.equal(state.plans[0].status, 'paused');
  assert.equal(state.events.filter((event) => event.kind === 'plan_paused').length, 0);
});

test('shared action transaction supports manual UI origin with audit and undo', () => {
  const port = memoryPort(makeState());
  const now = '2026-07-24T14:00:00.000Z';
  const { executeActionTransaction } = actionTransactions();

  const outcome = executeActionTransaction({
    action: 'patient.update',
    now,
    origin: { type: 'manual-ui' },
    supportsUndo: true,
    undoTtlMs: 30_000,
    mutate(state) {
      const patient = state.patients.find((item) => item.id === 'patient-1');
      patient.diagnosis = 'Dolor femoropatelar';
      patient.updatedAt = now;
      return {
        status: 'success',
        message: 'Paciente actualizado.',
        summary: ['Diagnóstico actualizado.'],
        data: { patientId: patient.id },
        affected: [{ type: 'patient', id: patient.id }],
      };
    },
  }, port);

  assert.equal(port.snapshot().patients[0].diagnosis, 'Dolor femoropatelar');
  assert.equal(outcome.undo.action, 'patient.update');
  assert.ok(outcome.undo.patches.some((patch) => patch.operation === 'restore' && patch.entityId === 'patient-1'));
  assert.equal(outcome.affected[0].afterUpdatedAt, now);

  const audit = port.snapshot().events[0];
  assert.equal(audit.kind, 'action_applied');
  assert.equal(audit.origin, 'manual');
  assert.equal(audit.actionOrigin, 'manual-ui');
  assert.equal(audit.intent, 'patient.update');
  assert.equal(audit.transactionId, outcome.transactionId);
  assert.equal(audit.undoReceiptId, outcome.undo.id);
});

test('shared action transaction rejects invalid candidate state atomically', () => {
  const initial = makeState();
  const port = memoryPort(initial);
  const now = '2026-07-24T14:30:00.000Z';
  const { executeActionTransaction } = actionTransactions();

  assert.throws(() => executeActionTransaction({
    action: 'plan.update',
    now,
    origin: { type: 'manual-ui' },
    supportsUndo: true,
    mutate(state) {
      const plan = state.plans.find((item) => item.id === 'active-plan');
      plan.exerciseIds = [];
      plan.updatedAt = now;
      return {
        status: 'success',
        message: 'Plan actualizado.',
        summary: [],
        affected: [{ type: 'plan', id: plan.id }],
      };
    },
  }, port), /plan activo requiere al menos un ejercicio/i);

  assert.deepEqual(port.snapshot(), initial);
});

test('shared action transaction preserves contextual AI audit metadata', () => {
  const port = memoryPort(makeState());
  const now = '2026-07-24T15:00:00.000Z';
  const { executeActionTransaction } = actionTransactions();

  const outcome = executeActionTransaction({
    action: 'patient.update',
    now,
    origin: {
      type: 'atal-ai-contextual',
      conversationId: 'conversation-contextual-1',
      draftId: 'draft-contextual-1',
      toolName: 'patient.update',
      toolVersion: 1,
      riskLevel: 'reversible-write',
      confirmationId: 'confirmation-1',
    },
    supportsUndo: true,
    mutate(state) {
      const patient = state.patients.find((item) => item.id === 'patient-1');
      patient.diagnosis = 'Tendinopatía rotuliana';
      patient.updatedAt = now;
      return {
        status: 'success',
        message: 'Paciente actualizado.',
        summary: [],
        affected: [{ type: 'patient', id: patient.id }],
      };
    },
  }, port);

  const audit = port.snapshot().events[0];
  assert.equal(audit.kind, 'ai_applied');
  assert.equal(audit.origin, 'atal-ai');
  assert.equal(audit.actionOrigin, 'atal-ai-contextual');
  assert.equal(audit.conversationId, 'conversation-contextual-1');
  assert.equal(audit.draftId, 'draft-contextual-1');
  assert.equal(audit.toolName, 'patient.update');
  assert.equal(audit.toolVersion, 1);
  assert.equal(audit.riskLevel, 'reversible-write');
  assert.equal(audit.confirmationId, 'confirmation-1');
  assert.equal(outcome.undo.action, 'patient.update');
});
