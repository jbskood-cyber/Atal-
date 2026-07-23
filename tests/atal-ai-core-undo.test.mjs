import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, exercise, memoryPort, patient, plan, validState } from './helpers/core-fixtures.mjs';

const transactionModule = () => loadCore('src/features/atal-ai/core/transactionEngine.js');
const undoModule = () => loadCore('src/features/atal-ai/core/undoEngine.js');
const stableModule = () => loadCore('src/features/atal-ai/core/stableValue.js');

function requestFor(name, execute, affected, risk = 'reversible-write') {
  const invocation = { tool: name, version: 1, input: {}, references: [], proposalId: `proposal-${name}` };
  const { fingerprintInvocation } = stableModule();
  return {
    definition: {
      name,
      version: 1,
      risk,
      mutates: true,
      supportsUndo: true,
      undoTtlMs: 30_000,
      requiredEntities: [],
      validateInput: (input) => input,
      preconditions() {},
      execute(environment) {
        execute(environment.state, environment.context.now, environment.transactionId);
        return { status: 'success', message: 'Aplicado', summary: ['Aplicado'], affected: affected(environment.state) };
      },
    },
    invocation,
    context: context(),
    resolved: {},
    confirmation: {
      id: 'confirmation-undo',
      fingerprint: fingerprintInvocation(invocation),
      mode: 'review',
      confirmedAt: '2026-07-21T17:59:00.000Z',
      expiresAt: '2026-07-21T18:04:00.000Z',
    },
  };
}

test('undo restores an updated plan atomically and records undone audit', () => {
  const { executeMutationTransaction } = transactionModule();
  const { executeUndo } = undoModule();
  const port = memoryPort();
  const before = structuredClone(port.read().plans[0]);
  const outcome = executeMutationTransaction(requestFor(
    'plan.pause',
    (state, now) => { state.plans[0].status = 'paused'; state.plans[0].updatedAt = now; },
    (state) => [{ type: 'plan', id: state.plans[0].id }],
  ), port);

  const undone = executeUndo(outcome.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.deepEqual(port.read().plans[0], before);
  assert.equal(undone.data.undoneTransactionId, outcome.transactionId);
  assert.equal(port.read().events.filter((event) => event.outcome === 'undone').length, 1);
  assert.equal(outcome.undo.consumedAt, '2026-07-21T18:00:20.000Z');
});

test('undo removes exact created composite entities and generated side effects', () => {
  const { executeMutationTransaction } = transactionModule();
  const { executeUndo } = undoModule();
  const port = memoryPort();
  const outcome = executeMutationTransaction(requestFor(
    'patient.create_with_record_and_plan',
    (state, now) => {
      const createdPatient = patient('patient-new', 'Paciente Nuevo');
      const createdExercise = exercise('exercise-new', 'Ejercicio Nuevo');
      const createdPlan = { ...plan('plan-new', 'patient-new', ['exercise-new']), status: 'draft' };
      createdPatient.createdAt = createdPatient.updatedAt = now;
      createdExercise.createdAt = createdExercise.updatedAt = now;
      createdPlan.createdAt = createdPlan.updatedAt = now;
      state.patients.push(createdPatient);
      state.exercises.push(createdExercise);
      state.plans.push(createdPlan);
      state.events.unshift({ id: 'event-generated', kind: 'patient_created', patientId: 'patient-new', title: 'Creado', detail: '', createdAt: now });
      state.notifications.unshift({ id: 'notification-generated', title: 'Creado', detail: '', severity: 'stable', href: '/', read: false, createdAt: now });
    },
    () => [
      { type: 'patient', id: 'patient-new' },
      { type: 'exercise', id: 'exercise-new' },
      { type: 'plan', id: 'plan-new' },
    ],
  ), port);

  executeUndo(outcome.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.equal(port.read().patients.some((item) => item.id === 'patient-new'), false);
  assert.equal(port.read().plans.some((item) => item.id === 'plan-new'), false);
  assert.equal(port.read().exercises.some((item) => item.id === 'exercise-new'), false);
  assert.equal(port.read().events.some((item) => item.id === 'event-generated'), false);
  assert.equal(port.read().events.some((item) => item.id === 'event-unrelated'), true);
  assert.equal(port.read().notifications.some((item) => item.id === 'notification-generated'), false);
  assert.equal(port.read().notifications.some((item) => item.id === 'notification-unrelated'), true);
});

test('expired consumed and stale receipts do not mutate state', () => {
  const { executeMutationTransaction } = transactionModule();
  const { executeUndo } = undoModule();

  const expiredPort = memoryPort();
  const expired = executeMutationTransaction(requestFor('plan.pause', (state, now) => {
    state.plans[0].status = 'paused'; state.plans[0].updatedAt = now;
  }, (state) => [{ type: 'plan', id: state.plans[0].id }]), expiredPort).undo;
  const expiredBefore = structuredClone(expiredPort.read());
  assert.throws(() => executeUndo(expired, context({ now: '2026-07-21T18:00:31.000Z' }), expiredPort), (error) => error?.code === 'CORE_UNDO_EXPIRED');
  assert.deepEqual(expiredPort.read(), expiredBefore);

  const stalePort = memoryPort();
  const stale = executeMutationTransaction(requestFor('plan.pause', (state, now) => {
    state.plans[0].status = 'paused'; state.plans[0].updatedAt = now;
  }, (state) => [{ type: 'plan', id: state.plans[0].id }]), stalePort).undo;
  stalePort.mutate((state) => { state.plans[0].updatedAt = '2026-07-21T18:00:10.000Z'; });
  const staleBefore = structuredClone(stalePort.read());
  assert.throws(() => executeUndo(stale, context({ now: '2026-07-21T18:00:20.000Z' }), stalePort), (error) => error?.code === 'CORE_UNDO_STALE');
  assert.deepEqual(stalePort.read(), staleBefore);

  const consumedPort = memoryPort();
  const consumed = executeMutationTransaction(requestFor('plan.pause', (state, now) => {
    state.plans[0].status = 'paused'; state.plans[0].updatedAt = now;
  }, (state) => [{ type: 'plan', id: state.plans[0].id }]), consumedPort).undo;
  consumed.consumedAt = '2026-07-21T18:00:10.000Z';
  assert.throws(() => executeUndo(consumed, context({ now: '2026-07-21T18:00:20.000Z' }), consumedPort));
});

test('undo refuses to remove a created exercise referenced by later data', () => {
  const { executeMutationTransaction } = transactionModule();
  const { executeUndo } = undoModule();
  const port = memoryPort();
  const outcome = executeMutationTransaction(requestFor(
    'exercise.create',
    (state, now) => { const item = exercise('exercise-new'); item.createdAt = item.updatedAt = now; state.exercises.push(item); },
    () => [{ type: 'exercise', id: 'exercise-new' }],
  ), port);
  port.mutate((state) => state.plans.push({ ...plan('plan-later', 'patient-1', ['exercise-new']), status: 'draft', createdAt: '2026-07-21T18:00:10.000Z', updatedAt: '2026-07-21T18:00:10.000Z' }));
  const before = structuredClone(port.read());
  assert.throws(
    () => executeUndo(outcome.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port),
    (error) => error?.code === 'CORE_UNDO_STALE',
  );
  assert.deepEqual(port.read(), before);
});
