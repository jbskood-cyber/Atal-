import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const agentLoopModule = () => loadCore('src/features/atal-ai/core/agentic/agentLoop.js');

function sessionReadCall(sessionId = 'plan-active-e2e_session_latest') {
  return {
    id: 'read-latest-session',
    bridge: 'atal_action',
    functionName: 'atal_app_read',
    tool: 'app.read',
    input: {
      resource: 'sessions',
      session: { type: 'session', id: sessionId },
      limit: 10,
    },
    references: [{ type: 'session', id: sessionId }],
  };
}

function reportReviewCall(sessionId = 'another-fabricated-session') {
  return {
    id: 'review-latest-session',
    bridge: 'atal_action',
    functionName: 'atal_report_review',
    tool: 'report.review',
    input: {
      session: { type: 'session', id: sessionId },
      observation: 'Buena tolerancia; continuar progresión gradual.',
    },
    references: [{ type: 'session', id: sessionId }],
  };
}

test('agent loop grounds a fabricated preliminary app.read session id for a latest completed session request', async () => {
  const { createAgentTask, runAgentLoop } = agentLoopModule();
  const goal = 'Revisa el reporte de la última sesión completada de este paciente y guarda esta observación clínica.';
  const task = createAgentTask(
    'conversation-latest-session-read',
    goal,
    ['app.read', 'report.review'],
    '2026-08-07T14:30:00.000Z',
    ['report.review'],
  );
  const turns = [
    { text: '', calls: [sessionReadCall()] },
    { text: '', calls: [reportReviewCall()] },
    { text: 'La última sesión quedó revisada.', calls: [] },
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
      draftId: 'draft-latest-session-read',
      route: '/assistant',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: 'plan-active-e2e',
      selectedExerciseId: '',
      selectedSessionId: '',
      now: '2026-08-07T14:30:00.000Z',
    },
    requestModel: async () => turns.shift(),
    executeTool: (invocation) => {
      executed.push(invocation);
      if (invocation.input.session?.id && invocation.input.session.id !== 'session-latest') {
        return {
          status: 'error',
          code: 'CORE_ENTITY_NOT_FOUND',
          message: 'No existe la sesión indicada.',
        };
      }
      if (invocation.tool === 'app.read') {
        return {
          status: 'success',
          message: 'Sesión consultada.',
          data: { sessions: [{ id: 'session-latest' }] },
          affected: [],
        };
      }
      return {
        status: 'success',
        message: 'Reporte revisado.',
        data: { sessionId: 'session-latest' },
        affected: [],
      };
    },
  });

  assert.equal(outcome.task.status, 'completed');
  assert.equal(executed.length, 2);
  assert.deepEqual(executed[0].input.session, { type: 'session', label: 'última sesión completada' });
  assert.deepEqual(executed[0].references, [{ type: 'session', label: 'última sesión completada' }]);
  assert.deepEqual(executed[1].input.session, { type: 'session', id: 'session-latest' });
  assert.deepEqual(executed[1].references, [{ type: 'session', id: 'session-latest' }]);
});
