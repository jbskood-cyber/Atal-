import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const policy = () => loadCore('src/features/atal-ai/core/agentic/contextualToolPolicy.js');

const context = (surface = 'patient') => ({
  assistantScope: 'contextual',
  contextSurface: surface,
  selectedPatientId: 'patient-a',
  selectedPlanId: 'plan-a',
  selectedExerciseId: 'exercise-a',
  selectedSessionId: 'session-a',
});

const MUTATING_TOOLS = [
  'patient.create',
  'patient.update',
  'patient.lifecycle',
  'patient_note.add',
  'patient_note.update',
  'clinical_record.upsert',
  'plan.create_simple',
  'plan.update_fields',
  'plan.duplicate',
  'plan.membership',
  'plan.activate',
  'plan.pause',
  'plan.complete',
  'plan.archive',
  'plan.restore',
  'exercise.create_simple',
  'exercise.update_fields',
  'exercise.duplicate',
  'exercise.lifecycle',
  'exercise.media',
  'session.start_or_resume',
  'session.update_draft',
  'session.complete',
  'report.review',
  'settings.update',
];

const ALLOWED_WRITES = {
  patient: new Set([
    'patient.update',
    'patient.lifecycle',
    'patient_note.add',
    'patient_note.update',
    'clinical_record.upsert',
    'plan.create_simple',
    'session.start_or_resume',
    'session.update_draft',
    'session.complete',
  ]),
  'clinical-record': new Set([
    'patient_note.add',
    'patient_note.update',
    'clinical_record.upsert',
  ]),
  plan: new Set([
    'plan.update_fields',
    'plan.duplicate',
    'plan.membership',
    'plan.activate',
    'plan.pause',
    'plan.complete',
    'plan.archive',
    'plan.restore',
    'exercise.create_simple',
    'exercise.update_fields',
    'session.start_or_resume',
    'session.update_draft',
    'session.complete',
  ]),
  exercise: new Set([
    'exercise.update_fields',
    'exercise.duplicate',
    'exercise.lifecycle',
    'exercise.media',
  ]),
  report: new Set(['report.review']),
};

test('contextual surfaces expose only tools related to their current entity', () => {
  assert.equal(policy().isContextualToolAllowed('patient', 'patient.update'), true);
  assert.equal(policy().isContextualToolAllowed('patient', 'exercise.lifecycle'), false);
  assert.equal(policy().isContextualToolAllowed('plan', 'plan.membership'), true);
  assert.equal(policy().isContextualToolAllowed('plan', 'patient.lifecycle'), false);
  assert.equal(policy().isContextualToolAllowed('exercise', 'exercise.update_fields'), true);
  assert.equal(policy().isContextualToolAllowed('report', 'report.review'), true);
});

test('contextual write permissions match the canonical surface matrix', () => {
  for (const [surface, allowed] of Object.entries(ALLOWED_WRITES)) {
    for (const tool of MUTATING_TOOLS) {
      assert.equal(
        policy().isContextualToolAllowed(surface, tool),
        allowed.has(tool),
        `${surface} should ${allowed.has(tool) ? 'allow' : 'block'} ${tool}`,
      );
    }
  }
});

test('contextual surfaces never expose workspace-wide patient creation or settings writes', () => {
  for (const surface of Object.keys(ALLOWED_WRITES)) {
    assert.equal(policy().isContextualToolAllowed(surface, 'patient.create'), false, `${surface} leaked patient.create`);
    assert.equal(policy().isContextualToolAllowed(surface, 'settings.update'), false, `${surface} leaked settings.update`);
  }
});

test('a contextual invocation cannot target another selected entity', () => {
  assert.equal(policy().contextualInvocationViolation(context('patient'), 'patient.update', [
    { type: 'patient', id: 'patient-b' },
  ]), 'La acción intentó usar un paciente diferente al contexto actual.');

  assert.equal(policy().contextualInvocationViolation(context('plan'), 'plan.update_fields', [
    { type: 'plan', id: 'plan-b' },
  ]), 'La acción intentó usar un plan diferente al contexto actual.');
});

test('a contextual invocation cannot escape by resolving another entity label', () => {
  assert.equal(policy().contextualInvocationViolation(context('patient'), 'patient.update', [
    { type: 'patient', label: 'Paciente B' },
  ]), 'La acción contextual debe usar el paciente fijado por esta pantalla.');

  assert.equal(policy().contextualInvocationViolation(context('plan'), 'plan.update_fields', [
    { type: 'plan', label: 'Plan de otro paciente' },
  ]), 'La acción contextual debe usar el plan fijado por esta pantalla.');
});

test('matching contextual references remain allowed', () => {
  assert.equal(policy().contextualInvocationViolation(context('plan'), 'plan.membership', [
    { type: 'patient', id: 'patient-a' },
    { type: 'plan', id: 'plan-a' },
    { type: 'exercise', id: 'exercise-a' },
  ]), null);
});

test('contextual app.read cannot escape into workspace-wide collections', () => {
  for (const resource of ['patients', 'plans', 'exercises', 'activity', 'settings']) {
    assert.equal(
      policy().contextualInvocationViolation(context('patient'), 'app.read', [], { resource }),
      'La consulta contextual debe permanecer dentro del objeto fijado por esta pantalla.',
      `expected ${resource} to be blocked from a patient contextual assistant`,
    );
  }

  assert.equal(
    policy().contextualInvocationViolation(context('patient'), 'app.read', [
      { type: 'patient', id: 'patient-a' },
    ], { resource: 'patient_profile' }),
    null,
  );
});
