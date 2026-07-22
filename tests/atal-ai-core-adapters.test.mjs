import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort, validState } from './helpers/core-fixtures.mjs';

const adaptersModule = () => loadCore('src/features/atal-ai/core/legacyAdapters.js');
const engineModule = () => loadCore('src/features/atal-ai/core/executionEngine.js');
const stableModule = () => loadCore('src/features/atal-ai/core/stableValue.js');

function draft(intent, patch = {}) {
  return {
    id: `draft-${intent}`,
    intent,
    selectedPatientId: '',
    selectedPlanId: '',
    selectedExerciseId: '',
    patient: {
      name: 'Paciente Nuevo', age: 30, birthDate: '', sex: '', reasonForVisit: 'Dolor de rodilla',
      affectedArea: 'Rodilla', evolutionTime: '2 semanas', providedDiagnosis: '', painLevel: 3,
      symptoms: ['dolor'], functionalLimitations: [], goals: ['Caminar'], relevantHistory: [],
      precautions: [], clinicalNotes: '',
    },
    plan: {
      title: 'Plan nuevo', goal: 'Recuperar', focus: 'Rodilla',
      duration: { value: 4, unit: 'weeks', customText: '' },
      frequency: { value: 3, period: 'week', customText: '' },
      phases: [], generalInstructions: '', progressCriteria: '', status: 'draft',
    },
    exercises: [{
      id: 'draft-exercise-1', name: 'Movilidad nueva', region: 'Rodilla', category: 'Movilidad',
      objective: '', startingPosition: '', instructions: [], precautions: [], equipment: '', difficulty: '',
      sets: 2, repetitions: '10', duration: '', rest: '', maxPain: 3, tags: [], notes: '',
      reusePreference: 'reuse-exact',
    }],
    responseMode: 'draft', assistantMessage: '', command: null, missingFields: [], uncertainFields: [],
    contradictions: [], followUpQuestion: '', proposedActions: [],
    baseVersions: { patientUpdatedAt: '', recordUpdatedAt: '', planUpdatedAt: '' },
    createdAt: '2026-07-21T17:50:00.000Z', updatedAt: '2026-07-21T17:50:00.000Z',
    ...patch,
  };
}

function contact() {
  return { phone: '', email: '', address: '', emergencyContact: '' };
}

function executeDraft(port, currentDraft, force = false) {
  const { invocationFromDraft } = adaptersModule();
  const { executeToolInvocation } = engineModule();
  const { fingerprintInvocation } = stableModule();
  const currentInvocation = invocationFromDraft(currentDraft, contact(), { proposalId: `proposal-${currentDraft.id}`, force });
  const confirmation = {
    id: 'confirmation-draft', fingerprint: fingerprintInvocation(currentInvocation), mode: 'review',
    confirmedAt: '2026-07-21T17:59:00.000Z', expiresAt: '2026-07-21T18:04:00.000Z',
  };
  return executeToolInvocation({ invocation: currentInvocation, context: context({ draftId: currentDraft.id }), confirmation }, { port });
}

test('every legacy command and mutating intent maps exactly once to a registered tool', () => {
  const { commandToolMap, draftToolMap } = adaptersModule();
  const { atalAIToolRegistry } = engineModule();
  const names = new Set(atalAIToolRegistry.list().map((definition) => definition.name));
  const commands = ['search_patient', 'summarize_patient', 'add_patient_note', 'activate_plan', 'pause_plan', 'complete_plan', 'archive_plan', 'restore_plan', 'replace_active_plan', 'summarize_sessions', 'create_report', 'export_data', 'update_settings'];
  const intents = ['create_patient_plan', 'create_plan_for_existing_patient', 'create_exercise', 'update_patient_record', 'update_existing_plan', 'update_existing_exercise'];
  assert.deepEqual(Object.keys(commandToolMap).sort(), commands.sort());
  assert.deepEqual(Object.keys(draftToolMap).sort(), intents.sort());
  for (const tool of [...Object.values(commandToolMap), ...Object.values(draftToolMap)]) assert.equal(names.has(tool), true, tool);
});

test('composite patient record exercises and plan commit and undo together', () => {
  const { executeUndo } = loadCore('src/features/atal-ai/core/undoEngine.js');
  const port = memoryPort();
  const before = structuredClone(port.read());
  const result = executeDraft(port, draft('create_patient_plan'));
  assert.equal(result.status, 'success');
  assert.equal(port.read().patients.length, before.patients.length + 1);
  assert.equal(port.read().clinicalRecords.length, before.clinicalRecords.length + 1);
  assert.equal(port.read().plans.length, before.plans.length + 1);
  assert.equal(port.read().exercises.length, before.exercises.length + 1);
  executeUndo(result.undo, context({ now: '2026-07-21T18:00:20.000Z' }), port);
  assert.deepEqual(port.read().patients, before.patients);
  assert.deepEqual(port.read().clinicalRecords, before.clinicalRecords);
  assert.deepEqual(port.read().plans, before.plans);
  assert.deepEqual(port.read().exercises, before.exercises);
});

test('duplicate patient clarifies and active-plan conflict rolls back composite creation', () => {
  const port = memoryPort();
  const duplicate = executeDraft(port, draft('create_patient_plan', { patient: { ...draft('create_patient_plan').patient, name: 'Paciente Uno' } }));
  assert.equal(duplicate.status, 'clarification');
  assert.equal(duplicate.clarification.code, 'ENTITY_AMBIGUOUS');

  const before = structuredClone(port.read());
  const conflictDraft = draft('create_plan_for_existing_patient', {
    selectedPatientId: 'patient-1',
    patient: { ...draft('create_plan_for_existing_patient').patient, name: '' },
    plan: { ...draft('create_plan_for_existing_patient').plan, status: 'active' },
  });
  const conflict = executeDraft(port, conflictDraft);
  assert.equal(conflict.status, 'error');
  assert.deepEqual(port.read(), before);
});

test('exercise reuse avoids duplicates while create-new is explicit', () => {
  const port = memoryPort();
  const reusable = draft('create_exercise', { exercises: [{ ...draft('create_exercise').exercises[0], name: 'Movilidad', region: 'Rodilla' }] });
  const reused = executeDraft(port, reusable);
  assert.equal(reused.status, 'success');
  assert.equal(port.read().exercises.length, 1);
  assert.match(reused.summary.join(' '), /reutilizado/i);

  const createNew = draft('create_exercise', { exercises: [{ ...reusable.exercises[0], reusePreference: 'create-new' }] });
  const created = executeDraft(port, createNew);
  assert.equal(created.status, 'success');
  assert.equal(port.read().exercises.length, 2);
  assert.match(created.summary.join(' '), /nuevo/i);
});

test('record update creates exactly one previous version and stale base blocks', () => {
  const state = validState();
  const port = memoryPort(state);
  const update = draft('update_patient_record', {
    selectedPatientId: 'patient-1',
    patient: { ...draft('update_patient_record').patient, name: '', clinicalNotes: 'Nota actualizada' },
    baseVersions: { patientUpdatedAt: state.patients[0].updatedAt, recordUpdatedAt: state.clinicalRecords[0].updatedAt, planUpdatedAt: '' },
  });
  const result = executeDraft(port, update);
  assert.equal(result.status, 'success');
  assert.equal(port.read().clinicalRecords[0].version, 2);
  assert.equal(port.read().clinicalRecordVersions.length, 1);

  const before = structuredClone(port.read());
  const stale = executeDraft(port, { ...update, id: 'draft-stale', baseVersions: { ...update.baseVersions, recordUpdatedAt: '2026-01-01T00:00:00.000Z' } });
  assert.equal(stale.status, 'error');
  assert.equal(stale.code, 'CORE_VERSION_CONFLICT');
  assert.deepEqual(port.read(), before);
});

test('legacy applyDraft compatibility source no longer mutates the store directly', () => {
  const source = readFileSync(new URL('../src/features/atal-ai/data/applyDraft.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /mutateAtalStore/);
  assert.match(source, /executeLegacyAIAction/);
});

test('legacy command registry delegates without store mutations or browser effects', () => {
  const source = readFileSync(new URL('../src/features/atal-ai/data/commandRegistry.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /mutateAtalStore|updatePlanStatus|updateSettings|createObjectURL|document\.createElement/);
  assert.match(source, /executeLegacyAIAction/);
  assert.match(source, /executeUndo/);
});

test('conversation UI handles the core result union without classifying risk', () => {
  const source = readFileSync(new URL('../src/features/atal-ai/AtalAIConversationScreen.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /getAICommandClass|commandClass|ToolRisk/);
  for (const status of ['clarification', 'confirmation-required', 'blocked', 'error', 'success']) {
    assert.match(source, new RegExp(`status===['"]${status}['"]`), status);
  }
  assert.match(source, /executeLegacyAIAction/);
});

test('conversation owns confirmed client download and exact confirmation fingerprint', () => {
  const source = readFileSync(new URL('../src/features/atal-ai/AtalAIConversationScreen.tsx', import.meta.url), 'utf8');
  assert.match(source, /clientEffect/);
  assert.match(source, /createObjectURL/);
  assert.match(source, /pendingConfirmation\.decision\.fingerprint/);
  assert.match(source, /mode:pendingConfirmation\.decision\.mode/);
  assert.match(source, /savedResult/);
});

test('saved results use the core undo receipt compatibility shape', () => {
  const source = readFileSync(new URL('../src/features/atal-ai/types.ts', import.meta.url), 'utf8');
  assert.match(source, /UndoReceipt/);
  assert.match(source, /AIUndoToken\s*=\s*UndoReceipt\s*\|\s*LegacyAIUndoToken/);
});
