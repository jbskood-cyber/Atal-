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

test('contextual surfaces expose only tools related to their current entity', () => {
  assert.equal(policy().isContextualToolAllowed('patient', 'patient.update'), true);
  assert.equal(policy().isContextualToolAllowed('patient', 'exercise.lifecycle'), false);
  assert.equal(policy().isContextualToolAllowed('plan', 'plan.membership'), true);
  assert.equal(policy().isContextualToolAllowed('plan', 'patient.lifecycle'), false);
  assert.equal(policy().isContextualToolAllowed('exercise', 'exercise.update_fields'), true);
  assert.equal(policy().isContextualToolAllowed('report', 'report.review'), true);
});

test('a contextual invocation cannot target another selected entity', () => {
  assert.equal(policy().contextualInvocationViolation(context('patient'), 'patient.update', [
    { type: 'patient', id: 'patient-b' },
  ]), 'La acción intentó usar un paciente diferente al contexto actual.');

  assert.equal(policy().contextualInvocationViolation(context('plan'), 'plan.update_fields', [
    { type: 'plan', id: 'plan-b' },
  ]), 'La acción intentó usar un plan diferente al contexto actual.');
});

test('matching contextual references remain allowed', () => {
  assert.equal(policy().contextualInvocationViolation(context('plan'), 'plan.membership', [
    { type: 'patient', id: 'patient-a' },
    { type: 'plan', id: 'plan-a' },
    { type: 'exercise', id: 'exercise-a' },
  ]), null);
});
