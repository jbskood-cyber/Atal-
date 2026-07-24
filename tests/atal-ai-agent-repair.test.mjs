import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort } from './helpers/core-fixtures.mjs';

const loopModule = () => loadCore('src/features/atal-ai/core/agentic/agentLoop.js');

function request() {
  return {
    conversationId: 'conversation-repair',
    text: '¿Cuántos planes activos tiene Laura?',
    route: '/assistant',
    selectedPatientId: 'patient-1',
    selectedPlanId: '',
    selectedExerciseId: '',
    selectedSessionId: '',
    conversationHistory: [],
    attachments: [],
  };
}

test('invalid tool input is returned to Gemini once for repair without mutating the store', async () => {
  const { createAgentTask, runAgentLoop } = loopModule();
  const port = memoryPort();
  const before = structuredClone(port.read());
  let turn = 0;
  const task = createAgentTask('conversation-repair', request().text, ['app.read'], '2026-07-24T00:00:00.000Z');

  const outcome = await runAgentLoop({
    task,
    request: request(),
    context: context({ conversationId: 'conversation-repair' }),
    requestModel: async ({ history }) => {
      turn += 1;
      if (turn === 1) {
        return {
          text: '',
          calls: [{ id: 'bad-read', bridge: 'atal_read', tool: 'app.read', input: {}, references: [] }],
          modelContent: { role: 'model', parts: [] },
        };
      }
      assert.equal(history.some((item) => JSON.stringify(item).includes('CORE_INPUT_INVALID')), true);
      return {
        text: 'No pude consultar ese dato con la primera llamada, pero corregí la consulta y encontré el plan activo.',
        calls: [],
        modelContent: { role: 'model', parts: [{ text: 'Consulta corregida.' }] },
      };
    },
    executeTool: (invocation) => {
      const { executeToolInvocation } = loadCore('src/features/atal-ai/core/executionEngine.js');
      return executeToolInvocation({ invocation, context: context({ conversationId: 'conversation-repair' }) }, { port });
    },
  });

  assert.equal(outcome.task.status, 'completed');
  assert.equal(turn, 2);
  assert.deepEqual(port.read(), before);
  assert.doesNotMatch(outcome.task.finalText, /CORE_INPUT_INVALID/);
});
