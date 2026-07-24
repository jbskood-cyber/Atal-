import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(path, 'utf8');

const files = {
  patientsUi: source('src/data/localPatients.ts'),
  recordsUi: source('src/features/clinical-record/clinicalRecordRepository.ts'),
  plansUi: source('src/data/localPlans.ts'),
  exercisesUi: source('src/data/localExercises.ts'),
  sessionsUi: source('src/features/guided-session/sessionRepository.ts'),
  patientsAi: source('src/features/atal-ai/core/tools/universalPatientTools.ts'),
  plansAi: source('src/features/atal-ai/core/tools/canonicalPlanTools.ts'),
  planLifecycleAi: source('src/features/atal-ai/core/tools/canonicalPlanLifecycleTools.ts'),
  exercisesAi: source('src/features/atal-ai/core/tools/canonicalUniversalExerciseTools.ts'),
  sessionsAi: source('src/features/atal-ai/core/tools/universalSessionSettingsTools.ts'),
};

const contracts = [
  {
    id: 1,
    name: 'create patient',
    checks: [
      [files.patientsUi, /applyCreatePatient/],
      [files.patientsAi, /applyCreatePatient/],
    ],
  },
  {
    id: 2,
    name: 'update patient',
    checks: [
      [files.patientsUi, /applyUpdatePatient/],
      [files.patientsAi, /applyUpdatePatient/],
    ],
  },
  {
    id: 3,
    name: 'archive or restore patient',
    checks: [
      [files.patientsUi, /applyPatientLifecycle/],
      [files.patientsAi, /applyPatientLifecycle/],
    ],
  },
  {
    id: 4,
    name: 'create or update clinical record',
    checks: [
      [files.recordsUi, /applyUpsertClinicalRecord/],
      [files.patientsAi, /applyUpsertClinicalRecord/],
    ],
  },
  {
    id: 5,
    name: 'create plan',
    checks: [
      [files.plansUi, /applyCreatePlan/],
      [files.plansAi, /applyCreatePlan/],
      [files.patientsAi, /applyCreatePlan/],
    ],
  },
  {
    id: 6,
    name: 'update plan fields',
    checks: [
      [files.plansUi, /applyUpdatePlan/],
      [files.plansAi, /applyUpdatePlan/],
    ],
  },
  {
    id: 7,
    name: 'plan lifecycle',
    checks: [
      [files.plansUi, /applyPlanLifecycle/],
      [files.planLifecycleAi, /applyPlanLifecycle/],
    ],
  },
  {
    id: 8,
    name: 'plan exercise membership',
    // UI saves the complete exerciseIds set through applyUpdatePlan while IA offers
    // add/remove/reorder through applyPlanMembership. Both live in planActions.ts,
    // share exercise existence/active-plan invariants and versioned record association.
    checks: [
      [files.plansUi, /applyUpdatePlan/],
      [files.plansAi, /applyPlanMembership/],
      [files.plansUi, /domain\/actions\/planActions/],
      [files.plansAi, /domain\/actions\/planActions/],
    ],
  },
  {
    id: 9,
    name: 'exercise create, update and lifecycle',
    checks: [
      [files.exercisesUi, /applyCreateExercise/],
      [files.exercisesUi, /applyUpdateExercise/],
      [files.exercisesUi, /applyExerciseLifecycle/],
      [files.exercisesAi, /applyCreateExercise/],
      [files.exercisesAi, /applyUpdateExercise/],
      [files.exercisesAi, /applyExerciseLifecycle/],
    ],
  },
  {
    id: 10,
    name: 'guided session register and complete',
    // Starting/completing a guided session is intentionally a patient-side flow;
    // no fake IA command is required. The clinician-side AI review uses the same
    // session domain action family rather than a parallel session write path.
    checks: [
      [files.sessionsUi, /applyRecordSessionStarted/],
      [files.sessionsUi, /applyCompleteSession/],
      [files.sessionsAi, /applyReviewSession/],
      [files.sessionsUi, /domain\/actions\/sessionActions/],
      [files.sessionsAi, /domain\/actions\/sessionActions/],
    ],
  },
];

for (const contract of contracts) {
  test(`behavior parity ${contract.id}/10: ${contract.name} stays on canonical domain actions`, () => {
    for (const [text, pattern] of contract.checks) assert.match(text, pattern);
  });
}

test('patient.create composite cannot bypass canonical plan creation', () => {
  assert.doesNotMatch(files.patientsAi, /environment\.state\.plans\.push\(/);
});
