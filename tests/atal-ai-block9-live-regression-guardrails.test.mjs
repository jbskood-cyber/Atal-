import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { memoryPort, validState } from './helpers/core-fixtures.mjs';

const adaptersModule = () => loadCore('src/features/atal-ai/core/legacyAdapters.js');
const requirementsModule = () => loadCore('src/features/atal-ai/core/agentic/compoundActionRequirements.js');

function planDraftForExistingPatientByName() {
  return {
    id: 'draft-fresh-existing-patient-plan',
    intent: 'create_patient_plan',
    selectedPatientId: '',
    selectedPlanId: '',
    selectedExerciseId: '',
    patient: {
      name: 'Paciente Uno', age: 30, birthDate: '', sex: '', reasonForVisit: '', affectedArea: '', evolutionTime: '',
      providedDiagnosis: '', painLevel: 0, symptoms: [], functionalLimitations: [], goals: [], relevantHistory: [], precautions: [], clinicalNotes: '',
    },
    plan: {
      title: 'Plan hombro Fresh QA', goal: 'Recuperar movilidad y fuerza del hombro', focus: 'Movilidad y fortalecimiento progresivo',
      duration: { value: 6, unit: 'weeks', customText: '' }, frequency: { value: 3, period: 'week', customText: '' },
      phases: [], generalInstructions: '', progressCriteria: '', status: 'draft',
    },
    exercises: [], responseMode: 'draft', assistantMessage: '', command: null, missingFields: [], uncertainFields: [], contradictions: [],
    followUpQuestion: '', proposedActions: ['create_patient_plan'], baseVersions: { patientUpdatedAt: '', recordUpdatedAt: '', planUpdatedAt: '' },
    createdAt: '2026-08-10T05:00:00.000Z', updatedAt: '2026-08-10T05:00:00.000Z',
  };
}

const workContext = {
  patientMode: 'none', selectedPatientId: '', selectedPlanId: '', selectedExerciseId: '',
};

test('legacy apply grounds a fresh create_patient_plan draft to the unique canonical patient before Action Core', () => {
  const { executeLegacyAIAction } = adaptersModule();
  const port = memoryPort(validState());
  const beforePatients = port.read().patients.length;
  const result = executeLegacyAIAction({
    draft: planDraftForExistingPatientByName(),
    workContext,
    metadata: { conversationId: 'conversation-fresh-plan', draftId: 'draft-fresh-existing-patient-plan', now: '2026-08-10T05:01:00.000Z' },
  }, { port });

  assert.equal(result.status, 'confirmation-required');
  assert.equal(result.invocation.tool, 'plan.create_for_patient');
  assert.deepEqual(result.invocation.references, [{ type: 'patient', id: 'patient-1' }]);
  assert.equal(result.invocation.input.draft.intent, 'create_plan_for_existing_patient');
  assert.equal(result.invocation.input.draft.selectedPatientId, 'patient-1');
  assert.equal(port.read().patients.length, beforePatients, 'grounding must not create a duplicate patient before confirmation');
});

test('latest completed session summaries require a canonical app.read before the agent may narrate completion', () => {
  const { requiredAgentToolsForSelection } = requirementsModule();
  const input = {
    text: 'Resúmeme la última sesión completada de este paciente usando únicamente lo guardado en Atal.',
    route: '/assistant', intent: 'summarize_sessions', selectionHints: '', hasImageOrPdf: false, hasAudio: false, hasConversationContext: true,
  };
  assert.deepEqual(requiredAgentToolsForSelection(input, ['app.read', 'patient.search']), ['app.read']);
});

test('ordinary read-only questions remain conversational and do not acquire an artificial required action', () => {
  const { requiredAgentToolsForSelection } = requirementsModule();
  const input = {
    text: '¿Qué ejercicios tiene este plan?', route: '/assistant', intent: 'summarize_patient', selectionHints: '',
    hasImageOrPdf: false, hasAudio: false, hasConversationContext: true,
  };
  assert.deepEqual(requiredAgentToolsForSelection(input, ['app.read', 'patient.search']), []);
});
