import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, validState } from './helpers/core-fixtures.mjs';

const groundingModule = () => loadCore('src/features/atal-ai/core/agentic/reportReviewGrounding.js');
const resolverModule = () => loadCore('src/features/atal-ai/core/entityResolver.js');
const agentLoopModule = () => loadCore('src/features/atal-ai/core/agentic/agentLoop.js');

function reportCall(sessionId = 'session-fabricated') {
  return {
    id: 'review-report',
    bridge: 'atal_action',
    functionName: 'atal_report_review',
    tool: 'report.review',
    input: {
      session: { type: 'session', id: sessionId },
      observation: 'Buena tolerancia; continuar progresión gradual',
    },
    references: [{ type: 'session', id: sessionId }],
  };
}

function completedSession(id, completedAt, patientId = 'patient-e2e', planId = 'plan-active-e2e') {
  return {
    id,
    patientId,
    planId,
    startedAt: completedAt,
    completedAt,
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
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}

test('latest completed session wording creates a deterministic report-review reference when same-turn read evidence is absent', () => {
  const { groundReportReviewCall } = groundingModule();
  const grounded = groundReportReviewCall(
    [],
    reportCall(),
    'Revisa el reporte de la última sesión completada y guarda esta observación clínica.',
  );

  assert.deepEqual(grounded.input.session, { type: 'session', label: 'última sesión completada' });
  assert.deepEqual(grounded.references, [{ type: 'session', label: 'última sesión completada' }]);
});

test('report.review resolves latest completed session deterministically inside selected patient/plan context', () => {
  const { resolveEntities } = resolverModule();
  const state = validState();
  state.sessions = [
    completedSession('session-older', '2026-07-26T09:30:00.000Z'),
    completedSession('session-latest', '2026-07-27T09:30:00.000Z'),
    { ...completedSession('session-partial', '2026-07-27T10:00:00.000Z'), status: 'partial', completedAt: '' },
  ];
  const invocation = {
    ...reportCall(),
    input: {
      ...reportCall().input,
      session: { type: 'session', label: 'última sesión completada' },
    },
    references: [{ type: 'session', label: 'última sesión completada' }],
  };

  const result = resolveEntities(
    state,
    invocation,
    context({ selectedPatientId: 'patient-e2e', selectedPlanId: 'plan-active-e2e' }),
  );

  assert.equal(result.status, 'resolved');
  assert.equal(result.entities.session.id, 'session-latest');
});

test('latest-session semantic reference remains fail-safe without patient or plan context', () => {
  const { resolveEntities } = resolverModule();
  const state = validState();
  state.sessions = [
    completedSession('session-a', '2026-07-27T09:30:00.000Z', 'patient-e2e', 'plan-active-e2e'),
    completedSession('session-b', '2026-07-27T10:30:00.000Z', 'patient-other', 'plan-other'),
  ];
  const invocation = {
    ...reportCall(),
    input: {
      ...reportCall().input,
      session: { type: 'session', label: 'última sesión completada' },
    },
    references: [{ type: 'session', label: 'última sesión completada' }],
  };

  const result = resolveEntities(state, invocation, context({ selectedPatientId: '', selectedPlanId: '' }));
  assert.equal(result.status, 'clarification');
});

test('agent loop grounds a fabricated report-review session id before Action Core execution', async () => {
  const { createAgentTask, runAgentLoop } = agentLoopModule();
  const goal = 'Resúmeme la última sesión completada de este paciente y añade una observación clínica.';
  const task = createAgentTask('conversation-latest-session', goal, ['report.review'], '2026-08-01T18:00:00.000Z');
  const turns = [
    {
      text: '',
      calls: [reportCall('session-fabricated-by-model')],
    },
    {
      text: 'La última sesión quedó revisada.',
      calls: [],
    },
  ];
  const executed = [];

  const outcome = await runAgentLoop({
    task,
    request: {
      conversationId: task.conversationId,
      text: goal,
      route: '/assistant',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: 'plan-active-e2e',
      selectedExerciseId: '',
      selectedSessionId: '',
      conversationHistory: [],
      attachments: [],
    },
    context: {
      conversationId: task.conversationId,
      draftId: 'draft-latest-session',
      route: '/assistant',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: 'plan-active-e2e',
      selectedExerciseId: '',
      selectedSessionId: '',
      now: '2026-08-01T18:00:00.000Z',
    },
    requestModel: async () => turns.shift(),
    executeTool: (invocation) => {
      executed.push(invocation);
      return { status: 'success', message: 'Reporte revisado.', data: {} };
    },
  });

  assert.equal(outcome.task.status, 'completed');
  assert.equal(executed.length, 1);
  assert.deepEqual(executed[0].input.session, { type: 'session', label: 'última sesión completada' });
  assert.deepEqual(executed[0].references, [{ type: 'session', label: 'última sesión completada' }]);
});
