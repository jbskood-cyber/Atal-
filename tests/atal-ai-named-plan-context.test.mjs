import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const { contextForNamedPlanRequest } = loadCore('src/features/atal-ai/core/agentic/contextForNamedPlanRequest.js');
const emptyContext = {
  intent: 'summarize_patient', patientMode: 'none',
  selectedPatientId: '', selectedPlanId: '', selectedExerciseId: '',
};
const patients = [
  { id: 'patient-e2e', name: 'Paciente E2E' },
  { id: 'other-patient', name: 'María López' },
];

test('a freeform plan request grounds one explicitly named existing patient without writing data', () => {
  const next = contextForNamedPlanRequest(
    'Crea para Paciente E2E un plan llamado “Plan hombro Fresh QA” de 6 semanas y déjalo como borrador.',
    emptyContext,
    patients,
  );
  assert.deepEqual(next, {
    intent: 'create_plan_for_existing_patient', patientMode: 'existing',
    selectedPatientId: 'patient-e2e', selectedPlanId: '', selectedExerciseId: '',
  });
  assert.equal(emptyContext.selectedPatientId, '');
});

test('unknown or ambiguous patients do not get selected by guesswork', () => {
  assert.equal(contextForNamedPlanRequest('Crea un plan para alguien desconocido.', emptyContext, patients), emptyContext);
  assert.equal(contextForNamedPlanRequest('Resume la evolución de Paciente E2E.', emptyContext, patients), emptyContext);
  assert.equal(contextForNamedPlanRequest('Crea un plan para Paciente E2E y María López.', emptyContext, patients), emptyContext);
});

test('an already selected patient is never switched automatically', () => {
  const selected = { ...emptyContext, intent: 'update_existing_plan', patientMode: 'existing', selectedPatientId: 'other-patient' };
  assert.equal(contextForNamedPlanRequest('Crea para Paciente E2E un plan.', selected, patients), selected);
});
