import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, exercise, memoryPort, plan, validState } from './helpers/core-fixtures.mjs';

function invocation(tool, input, references = [], authorization = 'explicit-user-request') {
  return { tool, version: 1, input, references, proposalId: `proposal-${tool}`, authorization };
}

function proof(currentInvocation, mode = 'explicit') {
  const { fingerprintInvocation } = loadCore('src/features/atal-ai/core/stableValue.js');
  return {
    id: `confirmation-${currentInvocation.tool}`,
    fingerprint: fingerprintInvocation(currentInvocation),
    mode,
    confirmedAt: '2026-07-21T17:59:00.000Z',
    expiresAt: '2026-07-21T18:04:00.000Z',
  };
}

function execute(port, currentInvocation, confirmation) {
  const { executeToolInvocation } = loadCore('src/features/atal-ai/core/executionEngine.js');
  return executeToolInvocation({ invocation: currentInvocation, context: context(), confirmation }, { port });
}

test('registry exposes universal read action and client-effect tools', () => {
  const { atalAIToolRegistry } = loadCore('src/features/atal-ai/core/executionEngine.js');
  const names = new Set(atalAIToolRegistry.list().map((tool) => tool.name));
  for (const name of [
    'app.read', 'patient.create', 'patient.update', 'patient.lifecycle', 'patient_note.update', 'clinical_record.upsert',
    'plan.create_simple', 'plan.update_fields', 'plan.duplicate', 'plan.membership',
    'exercise.create_simple', 'exercise.update_fields', 'exercise.duplicate', 'exercise.lifecycle',
    'report.review', 'settings.profile_update', 'settings.appearance', 'navigation.open',
    'session.start_or_resume', 'session.update_draft', 'session.complete', 'delivery.open', 'delivery.action',
  ]) assert.equal(names.has(name), true, `${name} missing`);
});

test('explicit reversible patient contact update executes immediately, audits and undoes', () => {
  const { executeUndo } = loadCore('src/features/atal-ai/core/undoEngine.js');
  const port = memoryPort();
  const current = invocation('patient.update', {
    patient: { type: 'patient', id: 'patient-1' },
    patch: { contact: { phone: '444 123 4567', email: 'paciente@example.com' } },
  }, [{ type: 'patient', id: 'patient-1' }]);
  const result = execute(port, current);
  assert.equal(result.status, 'success');
  assert.equal(port.read().patients[0].contact.phone, '444 123 4567');
  assert.equal(port.read().events.some((event) => event.toolName === 'patient.update'), true);
  assert.ok(result.undo);
  executeUndo(result.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.equal(port.read().patients[0].contact.phone, '');
});

test('file-derived reversible action pauses at compact review instead of mutating', () => {
  const port = memoryPort();
  const before = structuredClone(port.read());
  const current = invocation('patient.update', {
    patient: { type: 'patient', id: 'patient-1' },
    patch: { diagnosis: 'Dato extraído del archivo' },
  }, [{ type: 'patient', id: 'patient-1' }], 'file-derived');
  const result = execute(port, current);
  assert.equal(result.status, 'confirmation-required');
  assert.equal(result.decision.mode, 'review');
  assert.deepEqual(port.read(), before);
});

test('patient lifecycle remains sensitive and requires explicit confirmation', () => {
  const port = memoryPort();
  const current = invocation('patient.lifecycle', {
    patient: { type: 'patient', id: 'patient-1' }, archived: true,
  }, [{ type: 'patient', id: 'patient-1' }]);
  const gate = execute(port, current);
  assert.equal(gate.status, 'confirmation-required');
  assert.equal(gate.decision.mode, 'explicit');
  const result = execute(port, gate.invocation, proof(gate.invocation));
  assert.equal(result.status, 'success');
  assert.equal(port.read().patients[0].status, 'archived');
});

test('note update and clinical record upsert persist with validated undo', () => {
  const { executeUndo } = loadCore('src/features/atal-ai/core/undoEngine.js');
  const state = validState();
  state.notes.push({ id: 'note-1', patientId: 'patient-1', content: 'Antes', professional: 'Terapeuta', createdAt: state.updatedAt, updatedAt: state.updatedAt });
  const port = memoryPort(state);
  const note = invocation('patient_note.update', {
    patient: { type: 'patient', id: 'patient-1' }, noteId: 'note-1', content: 'Después',
  }, [{ type: 'patient', id: 'patient-1' }]);
  const noteResult = execute(port, note);
  assert.equal(noteResult.status, 'success');
  assert.equal(port.read().notes[0].content, 'Después');
  executeUndo(noteResult.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.equal(port.read().notes[0].content, 'Antes');

  const record = invocation('clinical_record.upsert', {
    patient: { type: 'patient', id: 'patient-1' }, patch: { painLevel: 6, clinicalNotes: 'Dolor después de caminar.' },
  }, [{ type: 'patient', id: 'patient-1' }]);
  const recordResult = execute(port, record);
  assert.equal(recordResult.status, 'success');
  assert.equal(port.read().clinicalRecords[0].version, 2);
  assert.equal(port.read().clinicalRecordVersions.length, 1);
  executeUndo(recordResult.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.equal(port.read().clinicalRecords[0].version, 1);
  assert.equal(port.read().clinicalRecordVersions.length, 0);
});

test('plan duplicate and membership operations preserve canonical order and undo', () => {
  const { executeUndo } = loadCore('src/features/atal-ai/core/undoEngine.js');
  const state = validState();
  state.exercises.push(exercise('exercise-2', 'Fuerza'));
  const port = memoryPort(state);
  const duplicate = invocation('plan.duplicate', { plan: { type: 'plan', id: 'plan-1' } }, [{ type: 'plan', id: 'plan-1' }]);
  const duplicated = execute(port, duplicate);
  assert.equal(duplicated.status, 'success');
  assert.equal(port.read().plans.length, 2);
  assert.equal(port.read().plans[1].status, 'draft');

  const membership = invocation('plan.membership', {
    plan: { type: 'plan', id: 'plan-1' }, operation: 'add', exerciseIds: ['exercise-2'],
  }, [{ type: 'plan', id: 'plan-1' }]);
  const added = execute(port, membership);
  assert.equal(added.status, 'success');
  assert.deepEqual(port.read().plans[0].exerciseIds, ['exercise-1', 'exercise-2']);

  const reorder = invocation('plan.membership', {
    plan: { type: 'plan', id: 'plan-1' }, operation: 'reorder', exerciseIds: ['exercise-2', 'exercise-1'],
  }, [{ type: 'plan', id: 'plan-1' }]);
  const reordered = execute(port, reorder);
  assert.equal(reordered.status, 'success');
  assert.deepEqual(port.read().plans[0].exerciseIds, ['exercise-2', 'exercise-1']);
  executeUndo(reordered.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.deepEqual(port.read().plans[0].exerciseIds, ['exercise-1', 'exercise-2']);
});

test('exercise lifecycle and report review are canonical and reversible', () => {
  const { executeUndo } = loadCore('src/features/atal-ai/core/undoEngine.js');
  const port = memoryPort();
  const lifecycle = invocation('exercise.lifecycle', {
    exercise: { type: 'exercise', id: 'exercise-1' }, archived: true,
  }, [{ type: 'exercise', id: 'exercise-1' }]);
  const archived = execute(port, lifecycle);
  assert.equal(archived.status, 'success');
  assert.equal(port.read().exercises[0].status, 'archived');
  executeUndo(archived.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.equal(port.read().exercises[0].status, 'active');

  const review = invocation('report.review', {
    session: { type: 'session', id: 'session-1' }, observation: 'Mantener carga actual.',
  }, [{ type: 'session', id: 'session-1' }]);
  const reviewed = execute(port, review);
  assert.equal(reviewed.status, 'success');
  assert.equal(port.read().sessions[0].clinicalObservation, 'Mantener carga actual.');
  executeUndo(reviewed.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.equal(port.read().sessions[0].clinicalObservation, '');
});

test('approved client effects do not mutate canonical store', () => {
  const port = memoryPort();
  const before = structuredClone(port.read());
  const navigation = execute(port, invocation('navigation.open', { route: '/patients/patient-1' }));
  assert.equal(navigation.status, 'success');
  assert.deepEqual(navigation.clientEffect, { type: 'navigate', href: '/patients/patient-1' });

  const theme = execute(port, invocation('settings.appearance', { mode: 'dark' }));
  assert.equal(theme.status, 'success');
  assert.deepEqual(theme.clientEffect, { type: 'theme', mode: 'dark' });

  const delivery = execute(port, invocation('delivery.open', { plan: { type: 'plan', id: 'plan-1' } }, [{ type: 'plan', id: 'plan-1' }]));
  assert.equal(delivery.status, 'success');
  assert.equal(delivery.clientEffect.planId, 'plan-1');
  assert.deepEqual(port.read(), before);
  assert.equal(port.mutationCount(), 0);
});
