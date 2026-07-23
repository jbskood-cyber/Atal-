import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const adapter = () => loadCore('src/features/atal-ai/contextual/conversationAdapter.js');

const base = {
  surface: 'patient', route: '/patients/p01', patientId: 'p01', clinicalRecordId: 'record-p01', clinicalRecordVersion: 2,
  planId: 'pl01', exerciseId: '', sessionId: '', reportId: '', contextLabel: 'en este paciente', entityLabel: 'María QA',
};

test('conversation key is stable for the same entity and separate across surfaces', () => {
  const { contextualConversationKey } = adapter();
  assert.equal(contextualConversationKey(base), contextualConversationKey({ ...base, route: '/patients/p01?tab=notes' }));
  assert.notEqual(contextualConversationKey(base), contextualConversationKey({ ...base, surface: 'clinical-record' }));
  assert.notEqual(contextualConversationKey(base), contextualConversationKey({ ...base, patientId: 'p02' }));
});

test('patient and record contexts bind the exact patient without demo fallbacks', () => {
  const { workContextForContext } = adapter();
  assert.deepEqual(workContextForContext(base), {
    intent: 'summarize_patient', patientMode: 'existing', selectedPatientId: 'p01', selectedPlanId: 'pl01', selectedExerciseId: '',
  });
  assert.deepEqual(workContextForContext({ ...base, surface: 'clinical-record' }), {
    intent: 'update_patient_record', patientMode: 'existing', selectedPatientId: 'p01', selectedPlanId: 'pl01', selectedExerciseId: '',
  });
});

test('plan exercise and report contexts bind their exact entity relationships', () => {
  const { workContextForContext } = adapter();
  assert.deepEqual(workContextForContext({ ...base, surface: 'plan' }), {
    intent: 'update_existing_plan', patientMode: 'existing', selectedPatientId: 'p01', selectedPlanId: 'pl01', selectedExerciseId: '',
  });
  assert.deepEqual(workContextForContext({ ...base, surface: 'exercise', patientId: '', planId: '', exerciseId: 'e01' }), {
    intent: 'update_existing_exercise', patientMode: 'none', selectedPatientId: '', selectedPlanId: '', selectedExerciseId: 'e01',
  });
  assert.deepEqual(workContextForContext({ ...base, surface: 'report', sessionId: 's01', reportId: 's01' }), {
    intent: 'summarize_sessions', patientMode: 'existing', selectedPatientId: 'p01', selectedPlanId: 'pl01', selectedExerciseId: '',
  });
});

test('action intent may refine the work context but cannot replace entity identity', () => {
  const { workContextForContext } = adapter();
  const refined = workContextForContext(base, 'add_patient_note');
  assert.equal(refined.intent, 'add_patient_note');
  assert.equal(refined.selectedPatientId, 'p01');
  assert.equal(refined.selectedPlanId, 'pl01');
});
