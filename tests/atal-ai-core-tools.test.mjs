import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort, plan, validState } from './helpers/core-fixtures.mjs';

const engineModule = () => loadCore('src/features/atal-ai/core/executionEngine.js');
const stableModule = () => loadCore('src/features/atal-ai/core/stableValue.js');

function invocation(tool, input, references = [], proposalId = `proposal-${tool}`) {
  return { tool, version: 1, input, references, proposalId };
}

function proof(currentInvocation, mode = 'review') {
  const { fingerprintInvocation } = stableModule();
  return {
    id: `confirmation-${currentInvocation.tool}`,
    fingerprint: fingerprintInvocation(currentInvocation),
    mode,
    confirmedAt: '2026-07-21T17:59:00.000Z',
    expiresAt: '2026-07-21T18:04:00.000Z',
  };
}

function execute(port, currentInvocation, confirmation) {
  const { executeToolInvocation } = engineModule();
  return executeToolInvocation(
    { invocation: currentInvocation, context: context(), confirmation },
    { port },
  );
}

test('default registry exposes exact query direct and blocked tool names', () => {
  const { atalAIToolRegistry } = engineModule();
  const names = atalAIToolRegistry.list().map((definition) => definition.name);
  for (const name of [
    'patient.search', 'patient.summarize', 'session.summarize_recent', 'report.prepare_session_summary',
    'patient_note.add', 'plan.activate', 'plan.pause', 'plan.complete', 'plan.archive', 'plan.restore',
    'plan.replace_active', 'settings.update', 'data.export_local', 'patient.delete_permanently',
    'plan.delete_permanently', 'message.send_patient', 'email.send_report', 'cloud.sync',
  ]) assert.equal(names.includes(name), true, `${name} missing`);
});

test('patient search is bounded and leaves all state unchanged', () => {
  const state = validState();
  for (let index = 2; index <= 8; index += 1) {
    state.patients.push({ ...state.patients[0], id: `patient-${index}`, name: `Paciente ${index}` });
  }
  const port = memoryPort(state);
  const before = structuredClone(port.read());
  const result = execute(port, invocation('patient.search', { query: 'paciente' }));
  assert.equal(result.status, 'success');
  assert.equal(result.data.matches.length, 5);
  assert.deepEqual(port.read(), before);
  assert.equal(port.mutationCount(), 0);
});

test('patient and session summaries require and use uniquely resolved patient', () => {
  const port = memoryPort();
  const patientSummary = execute(port, invocation('patient.summarize', { patient: { type: 'patient', id: 'patient-1' } }, [{ type: 'patient', id: 'patient-1' }]));
  assert.equal(patientSummary.status, 'success');
  assert.equal(patientSummary.href, '/patients/patient-1');

  const sessions = execute(port, invocation('session.summarize_recent', { patient: { type: 'patient', id: 'patient-1' }, limit: 3 }, [{ type: 'patient', id: 'patient-1' }]));
  assert.equal(sessions.status, 'success');
  assert.equal(sessions.data.sessions.length, 1);
});

test('report by patient with multiple sessions asks for clarification', () => {
  const state = validState();
  state.sessions.push({ ...state.sessions[0], id: 'session-2', startedAt: '2026-07-20T18:00:00.000Z', completedAt: '2026-07-20T18:10:00.000Z' });
  const port = memoryPort(state);
  const result = execute(port, invocation('report.prepare_session_summary', { patient: { type: 'patient', id: 'patient-1' } }, [{ type: 'patient', id: 'patient-1' }]));
  assert.equal(result.status, 'clarification');
  assert.equal(result.clarification.code, 'ENTITY_AMBIGUOUS');
  assert.equal(port.mutationCount(), 0);
});

test('patient note is trimmed gated audited and reversible', () => {
  const { executeUndo } = loadCore('src/features/atal-ai/core/undoEngine.js');
  const port = memoryPort();
  const current = invocation('patient_note.add', { patient: { type: 'patient', id: 'patient-1' }, content: '  Nota clínica  ' }, [{ type: 'patient', id: 'patient-1' }]);
  const gate = execute(port, current);
  assert.equal(gate.status, 'confirmation-required');
  const result = execute(port, current, proof(gate.invocation));
  assert.equal(result.status, 'success');
  assert.equal(port.read().notes[0].content, 'Nota clínica');
  assert.equal(port.read().events.filter((event) => event.transactionId === result.transactionId).length, 1);
  executeUndo(result.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.equal(port.read().notes.length, 0);
});

test('plan transitions enforce preconditions and active conflict', () => {
  const state = validState();
  state.plans.push({ ...plan('plan-2'), status: 'draft' });
  const port = memoryPort(state);

  const activate = invocation('plan.activate', { plan: { type: 'plan', id: 'plan-2' } }, [{ type: 'plan', id: 'plan-2' }]);
  const conflict = execute(port, activate, proof(activate, 'explicit'));
  assert.equal(conflict.status, 'error');
  assert.equal(conflict.code, 'CORE_PRECONDITION_FAILED');

  const pauseDraft = invocation('plan.pause', { plan: { type: 'plan', id: 'plan-2' } }, [{ type: 'plan', id: 'plan-2' }]);
  const invalid = execute(port, pauseDraft, proof(pauseDraft));
  assert.equal(invalid.status, 'error');
  assert.equal(invalid.code, 'CORE_PRECONDITION_FAILED');
});

test('replace active changes two plans atomically and undo restores both', () => {
  const { executeUndo } = loadCore('src/features/atal-ai/core/undoEngine.js');
  const state = validState();
  state.plans.push({ ...plan('plan-2'), status: 'draft' });
  const port = memoryPort(state);
  const current = invocation('plan.replace_active', { plan: { type: 'plan', id: 'plan-2' }, replaceCurrent: true }, [
    { type: 'patient', id: 'patient-1' },
    { type: 'plan', id: 'plan-2' },
  ]);
  const result = execute(port, current, proof(current, 'explicit'));
  assert.equal(result.status, 'success', JSON.stringify(result));
  assert.deepEqual(port.read().plans.map((item) => [item.id, item.status]), [['plan-1', 'paused'], ['plan-2', 'active']]);
  executeUndo(result.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.deepEqual(port.read().plans.map((item) => [item.id, item.status]), [['plan-1', 'active'], ['plan-2', 'draft']]);
});

test('settings rejects unknown keys and export returns a client descriptor without DOM or network', () => {
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
    const result = execute(port, exportInvocation, proof(exportInvocation, 'explicit'));
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
