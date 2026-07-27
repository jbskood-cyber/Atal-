import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const grounding = () => loadCore('src/features/atal-ai/core/agentic/reportReviewGrounding.js');

function readSessionsStep(sessions) {
  return {
    callId: 'read-sessions',
    invocation: {
      tool: 'app.read', version: 1, proposalId: 'read-sessions', references: [],
      input: { resource: 'sessions', status: 'completed' },
    },
    result: {
      status: 'success',
      message: `Encontré ${sessions.length} sesiones.`,
      summary: [],
      data: { sessions },
      affected: [],
    },
  };
}

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

test('grounds report.review to the sole completed session returned by same-turn canonical read', () => {
  const { groundReportReviewCall } = grounding();
  const grounded = groundReportReviewCall(
    [readSessionsStep([{ id: 'session-canonical', status: 'completed', completedAt: '2026-07-27T09:13:08.714Z' }])],
    reportCall(),
  );

  assert.deepEqual(grounded.input.session, { type: 'session', id: 'session-canonical' });
  assert.deepEqual(grounded.references, [{ type: 'session', id: 'session-canonical' }]);
});

test('does not guess when the same-turn read contains multiple sessions', () => {
  const { groundReportReviewCall } = grounding();
  const call = reportCall();
  const grounded = groundReportReviewCall([
    readSessionsStep([
      { id: 'session-a', status: 'completed', completedAt: '2026-07-27T09:13:08.714Z' },
      { id: 'session-b', status: 'completed', completedAt: '2026-07-26T09:13:08.714Z' },
    ]),
  ], call);

  assert.deepEqual(grounded, call);
});

test('does not rewrite report.review without canonical session evidence', () => {
  const { groundReportReviewCall } = grounding();
  const call = reportCall();
  assert.deepEqual(groundReportReviewCall([], call), call);
});