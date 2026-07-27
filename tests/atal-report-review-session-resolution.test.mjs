import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, validState } from './helpers/core-fixtures.mjs';

const resolverModule = () => loadCore('src/features/atal-ai/core/entityResolver.js');

function reportInvocation(sessionId = 'session-fabricated') {
  return {
    tool: 'report.review',
    version: 1,
    input: {
      session: { type: 'session', id: sessionId },
      observation: 'Buena tolerancia; continuar progresión gradual',
    },
    references: [{ type: 'session', id: sessionId }],
    proposalId: 'proposal-report-review',
  };
}

function completedSession(id, patientId = 'patient-e2e', planId = 'plan-active-e2e') {
  return {
    id,
    patientId,
    planId,
    startedAt: '2026-07-27T09:00:00.000Z',
    completedAt: '2026-07-27T09:30:00.000Z',
    status: 'completed',
    startPain: 5,
    startEnergy: 7,
    startComment: '',
    exercises: {},
    endPain: 3,
    endEnergy: 6,
    effort: 5,
    symptoms: [],
    comment: 'Buena tolerancia',
    easiest: '',
    hardest: '',
    discomfort: '',
    durationMinutes: 30,
    clinicalObservation: '',
    createdAt: '2026-07-27T09:00:00.000Z',
    updatedAt: '2026-07-27T09:30:00.000Z',
  };
}

test('report.review keeps fabricated session ids strict even when context has exactly one completed session', () => {
  const { resolveEntities } = resolverModule();
  const state = validState();
  state.sessions = [completedSession('session-canonical')];

  const result = resolveEntities(
    state,
    reportInvocation(),
    context({ selectedPatientId: 'patient-e2e', selectedPlanId: 'plan-active-e2e' }),
  );

  assert.equal(result.status, 'clarification');
  assert.equal(result.clarification.code, 'ENTITY_NOT_FOUND');
});

test('report.review never guesses between multiple completed sessions in the selected context', () => {
  const { resolveEntities } = resolverModule();
  const state = validState();
  state.sessions = [completedSession('session-a'), completedSession('session-b')];

  const result = resolveEntities(
    state,
    reportInvocation(),
    context({ selectedPatientId: 'patient-e2e', selectedPlanId: 'plan-active-e2e' }),
  );

  assert.equal(result.status, 'clarification');
  assert.equal(result.clarification.code, 'ENTITY_NOT_FOUND');
});

test('other tools keep strict invalid-session-id semantics', () => {
  const { resolveEntities } = resolverModule();
  const state = validState();
  state.sessions = [completedSession('session-canonical')];
  const invocation = {
    ...reportInvocation(),
    tool: 'session.summarize_recent',
  };

  const result = resolveEntities(
    state,
    invocation,
    context({ selectedPatientId: 'patient-e2e', selectedPlanId: 'plan-active-e2e' }),
  );

  assert.equal(result.status, 'clarification');
  assert.equal(result.clarification.code, 'ENTITY_NOT_FOUND');
});
