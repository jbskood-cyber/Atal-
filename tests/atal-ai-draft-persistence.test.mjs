import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

function localStorageStub() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
  };
}

function draft(id) {
  return {
    id,
    intent: 'create_patient_plan',
    selectedPatientId: '',
    selectedPlanId: '',
    selectedExerciseId: '',
    responseMode: 'draft',
    assistantMessage: 'Borrador de prueba.',
    command: null,
    patient: { name: '', symptoms: [] },
    plan: { title: '', progressCriteria: '' },
    exercises: [],
    missingFields: [],
    uncertainFields: [],
    contradictions: [],
    followUpQuestion: '',
    proposedActions: [],
    baseVersions: { patientUpdatedAt: '', recordUpdatedAt: '', planUpdatedAt: '' },
  };
}

function conversation(id, draftId, status) {
  const now = '2026-07-24T05:00:00.000Z';
  return {
    id,
    draftId,
    scope: 'global',
    createdAt: now,
    updatedAt: now,
    status,
    composerText: '',
    transcription: '',
    messages: [],
    attachmentMetadata: [],
    privateContact: { phone: '', email: '', address: '', emergencyContact: '' },
    workContext: { intent: 'create_patient_plan', patientMode: 'new', selectedPatientId: '', selectedPlanId: '', selectedExerciseId: '' },
  };
}

test('an applied draft is removed from local persistence and cannot return after reload', () => {
  const previousWindow = global.window;
  global.window = { localStorage: localStorageStub() };
  try {
    const repository = loadCore('src/features/atal-ai/data/aiRepository.js');
    repository.saveAIDraft(draft('draft-applied'));
    assert.equal(repository.getAIDraft('draft-applied')?.id, 'draft-applied');

    repository.deleteAIDraft('draft-applied');

    assert.equal(repository.getAIDraft('draft-applied'), null);
    assert.deepEqual(repository.readAIDrafts(), []);
  } finally {
    global.window = previousWindow;
  }
});

test('saving a conversation as applied automatically purges its review draft', () => {
  const previousWindow = global.window;
  global.window = { localStorage: localStorageStub() };
  try {
    const repository = loadCore('src/features/atal-ai/data/aiRepository.js');
    repository.saveAIDraft(draft('draft-auto-purge'));
    repository.saveAIConversation(conversation('conversation-applied', 'draft-auto-purge', 'saved'));

    assert.equal(repository.getAIDraft('draft-auto-purge'), null);
    assert.equal(repository.readAIConversations()[0].status, 'saved');
  } finally {
    global.window = previousWindow;
  }
});
