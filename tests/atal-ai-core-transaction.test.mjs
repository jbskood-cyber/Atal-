import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { CORE_NOW, context, memoryPort, patient, plan, validState } from './helpers/core-fixtures.mjs';

const invariantsModule = () => loadCore('src/features/atal-ai/core/stateInvariants.js');
const transactionModule = () => loadCore('src/features/atal-ai/core/transactionEngine.js');
const stableModule = () => loadCore('src/features/atal-ai/core/stableValue.js');

function expectInvariant(mutator, previous) {
  const { validateAtalStateInvariants } = invariantsModule();
  const state = structuredClone(previous ?? validState());
  mutator(state);
  assert.throws(
    () => validateAtalStateInvariants(state, previous),
    (error) => error?.code === 'CORE_INVARIANT_FAILED',
  );
}

test('state invariants reject duplicate IDs and invalid relationships', () => {
  expectInvariant((state) => state.patients.push(patient('patient-1', 'Duplicado')));
  expectInvariant((state) => { state.plans[0].patientId = 'missing'; });
  expectInvariant((state) => { state.plans[0].exerciseIds = ['missing']; });
  expectInvariant((state) => { state.clinicalRecords[0].patientId = 'missing'; });
  expectInvariant((state) => { state.sessions[0].patientId = 'missing'; });
  expectInvariant((state) => { state.sessions[0].planId = 'missing'; });
});

test('state invariants reject invalid active plans exercise sets and pain', () => {
  expectInvariant((state) => state.plans.push(plan('plan-2')));
  expectInvariant((state) => { state.plans[0].exerciseIds = []; });
  expectInvariant((state) => { state.exercises[0].sets = 0; });
  expectInvariant((state) => { state.exercises[0].maxPain = 11; });
});

test('record update requires one version increment and one previous snapshot', () => {
  const previous = validState();
  expectInvariant((state) => {
    state.clinicalRecords[0].clinicalNotes = 'Actualizado';
    state.clinicalRecords[0].updatedAt = '2026-07-21T18:01:00.000Z';
  }, previous);

  expectInvariant((state) => {
    const before = structuredClone(state.clinicalRecords[0]);
    state.clinicalRecords[0].clinicalNotes = 'Actualizado';
    state.clinicalRecords[0].version = 3;
    state.clinicalRecords[0].updatedAt = '2026-07-21T18:01:00.000Z';
    state.clinicalRecordVersions.push({ id: 'version-1', recordId: before.id, patientId: before.patientId, version: before.version, snapshot: before, createdAt: '2026-07-21T18:01:00.000Z' });
  }, previous);
});

function pauseRequest(proofPatch = {}) {
  const invocation = {
    tool: 'plan.pause',
    version: 1,
    input: { planId: 'plan-1' },
    references: [{ type: 'plan', id: 'plan-1' }],
    proposalId: 'proposal-pause',
  };
  const { fingerprintInvocation } = stableModule();
  return {
    definition: {
      name: 'plan.pause',
      version: 1,
      risk: 'reversible-write',
      mutates: true,
      supportsUndo: true,
      undoTtlMs: 30_000,
      requiredEntities: ['plan'],
      validateInput: (input) => input,
      preconditions(environment) {
        const current = environment.state.plans.find((item) => item.id === environment.resolved.plan.id);
        if (current?.status !== 'active') throw new Error('Plan must be active');
      },
      execute(environment) {
        const current = environment.state.plans.find((item) => item.id === environment.resolved.plan.id);
        current.status = 'paused';
        current.updatedAt = environment.context.now;
        return { status: 'success', message: 'Pausado', summary: ['Plan pausado'], affected: [{ type: 'plan', id: current.id }] };
      },
    },
    invocation,
    context: context(),
    resolved: { plan: validState().plans[0] },
    confirmation: {
      id: 'confirmation-1',
      fingerprint: fingerprintInvocation(invocation),
      mode: 'review',
      confirmedAt: '2026-07-21T17:59:00.000Z',
      expiresAt: '2026-07-21T18:04:00.000Z',
      ...proofPatch,
    },
  };
}

test('mutation transaction commits once with one audit and undo receipt', () => {
  const { executeMutationTransaction } = transactionModule();
  const port = memoryPort();
  const result = executeMutationTransaction(pauseRequest(), port);
  assert.equal(port.mutationCount(), 1);
  assert.equal(port.read().plans[0].status, 'paused');
  assert.equal(port.read().events.filter((event) => event.transactionId === result.transactionId).length, 1);
  assert.equal(result.undo.patches[0].operation, 'restore');
  assert.equal(result.affected[0].afterUpdatedAt, CORE_NOW);
});

test('executor and invariant failures roll back every candidate change', () => {
  const { executeMutationTransaction } = transactionModule();
  for (const change of ['throw', 'invariant']) {
    const port = memoryPort();
    const before = structuredClone(port.read());
    const request = pauseRequest();
    request.definition.execute = (environment) => {
      environment.state.plans[0].status = 'paused';
      if (change === 'throw') throw new Error('injected');
      environment.state.plans[0].patientId = 'missing';
      return { status: 'success', message: 'bad', summary: [], affected: [{ type: 'plan', id: 'plan-1' }] };
    };
    assert.throws(() => executeMutationTransaction(request, port));
    assert.deepEqual(port.read(), before);
    assert.equal(port.read().events.filter((event) => event.transactionId).length, 0);
  }
});

test('stale confirmation prevents entering the mutation port', () => {
  const { executeMutationTransaction } = transactionModule();
  const port = memoryPort();
  const request = pauseRequest({ fingerprint: 'stale' });
  assert.throws(
    () => executeMutationTransaction(request, port),
    (error) => error?.code === 'CORE_CONFIRMATION_STALE',
  );
  assert.equal(port.mutationCount(), 0);
});
