import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort, validState } from './helpers/core-fixtures.mjs';

function invocation(input, references = []) {
  return { tool: 'app.read', version: 1, input, references, proposalId: `read-${input.resource}` };
}

function execute(port, input, references = []) {
  const { executeToolInvocation } = loadCore('src/features/atal-ai/core/executionEngine.js');
  return executeToolInvocation({ invocation: invocation(input, references), context: context() }, { port });
}

test('universal read model lists and counts active patients without mutation', () => {
  const state = validState();
  state.patients.push({
    ...structuredClone(state.patients[0]),
    id: 'patient-2',
    name: 'Paciente archivado',
    status: 'archived',
    createdAt: state.updatedAt,
    updatedAt: state.updatedAt,
  });
  const port = memoryPort(state);
  const before = structuredClone(port.read());
  const result = execute(port, { resource: 'patients', status: 'active', limit: 50 });
  assert.equal(result.status, 'success');
  assert.equal(result.data.total, 1);
  assert.equal(result.data.patients[0].id, 'patient-1');
  assert.match(result.message, /1 pacientes/);
  assert.deepEqual(port.read(), before);
  assert.equal(port.mutationCount(), 0);
});

test('universal read model exposes complete patient context without mutation', () => {
  const state = validState();
  state.notes.push({ id: 'note-1', patientId: 'patient-1', content: 'Mejor tolerancia.', professional: 'Terapeuta', createdAt: state.updatedAt, updatedAt: state.updatedAt });
  state.clinicalRecordVersions.push({ id: 'version-1', recordId: 'record-1', patientId: 'patient-1', version: 1, snapshot: structuredClone(state.clinicalRecords[0]), createdAt: state.updatedAt });
  const port = memoryPort(state);
  const before = structuredClone(port.read());
  const result = execute(port, { resource: 'patient_profile', patient: { type: 'patient', id: 'patient-1' }, limit: 10 }, [{ type: 'patient', id: 'patient-1' }]);
  assert.equal(result.status, 'success');
  assert.equal(result.data.patient.id, 'patient-1');
  assert.equal(result.data.notes.length, 1);
  assert.equal(result.data.versions.length, 1);
  assert.deepEqual(port.read(), before);
  assert.equal(port.mutationCount(), 0);
});

test('universal read model filters plans and exercises deterministically', () => {
  const port = memoryPort();
  const plans = execute(port, { resource: 'plans', patient: { type: 'patient', id: 'patient-1' }, status: 'active', limit: 5 }, [{ type: 'patient', id: 'patient-1' }]);
  assert.equal(plans.status, 'success');
  assert.equal(plans.data.plans.length, 1);

  const exercises = execute(port, { resource: 'exercises', query: 'movilidad', limit: 5 });
  assert.equal(exercises.status, 'success');
  assert.equal(exercises.data.exercises[0].id, 'exercise-1');
});

test('session preparation and delivery use canonical patient plan and exercises', () => {
  const port = memoryPort();
  const references = [{ type: 'patient', id: 'patient-1' }, { type: 'plan', id: 'plan-1' }];
  const preparation = execute(port, { resource: 'session_preparation', patient: references[0], plan: references[1] }, references);
  assert.equal(preparation.status, 'success');
  assert.equal(preparation.data.exercises.length, 1);
  assert.equal(preparation.href, '/patients/patient-1/session');

  const delivery = execute(port, { resource: 'delivery', plan: references[1] }, [{ type: 'plan', id: 'plan-1' }]);
  assert.equal(delivery.status, 'success');
  assert.equal(delivery.data.patient.id, 'patient-1');
  assert.equal(delivery.data.plan.id, 'plan-1');
});

test('universal read input remains bounded and rejects unsupported resources', () => {
  const port = memoryPort();
  const invalidResource = execute(port, { resource: 'everything' });
  assert.equal(invalidResource.status, 'error');
  assert.equal(invalidResource.code, 'CORE_INPUT_INVALID');

  const invalidLimit = execute(port, { resource: 'activity', limit: 500 });
  assert.equal(invalidLimit.status, 'error');
  assert.equal(invalidLimit.code, 'CORE_INPUT_INVALID');
});
