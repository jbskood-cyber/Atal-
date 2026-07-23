import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const handoffModule = () => loadCore('src/features/atal-ai/contextual/globalHandoff.js');

const context = {
  surface: 'patient',
  route: '/patients/patient-1',
  patientId: 'patient-1',
  clinicalRecordId: 'record-1',
  clinicalRecordVersion: 2,
  planId: 'plan-1',
  exerciseId: '',
  sessionId: '',
  reportId: '',
  contextLabel: 'en este paciente',
  entityLabel: 'Paciente Uno',
};

const conversation = {
  id: 'contextual-conversation-1',
  draftId: 'contextual-draft-1',
  createdAt: '2026-07-23T18:00:00.000Z',
  updatedAt: '2026-07-23T18:05:00.000Z',
  status: 'empty',
  composerText: '',
  transcription: '',
  messages: [
    { id: 'm1', role: 'user', text: 'Texto privado de esta pantalla.', createdAt: '2026-07-23T18:01:00.000Z', attachments: [] },
    { id: 'm2', role: 'assistant', text: 'Respuesta contextual.', createdAt: '2026-07-23T18:02:00.000Z', attachments: [] },
  ],
  attachmentMetadata: [],
  privateContact: { phone: '', email: '', address: '', emergencyContact: '' },
  workContext: { intent: 'summarize_patient', patientMode: 'existing', selectedPatientId: 'patient-1', selectedPlanId: 'plan-1', selectedExerciseId: '' },
};

test('explicit handoff carries a concise prompt and references but no contextual transcript', () => {
  const handoff = handoffModule().buildGlobalAIHandoff(context, conversation, null, '2026-07-23T18:10:00.000Z');
  assert.equal(handoff.sourceConversationId, 'contextual-conversation-1');
  assert.equal(handoff.sourceContextKey, 'patient:patient-1');
  assert.equal(handoff.workContext.selectedPatientId, 'patient-1');
  assert.match(handoff.prompt, /Texto privado de esta pantalla/);
  assert.equal('messages' in handoff, false);
  assert.equal('conversationId' in handoff, false);
});
