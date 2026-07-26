import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort } from './helpers/core-fixtures.mjs';

const loopModule = () => loadCore('src/features/atal-ai/core/agentic/agentLoop.js');

function request() {
  return {
    conversationId: 'conversation-pseudo-tool',
    text: '¿Qué pacientes tengo registrados? Dime los nombres usando únicamente la información guardada en Atal.',
    route: '/assistant',
    selectedPatientId: '',
    selectedPlanId: '',
    selectedExerciseId: '',
    selectedSessionId: '',
    attachments: [],
  };
}

test('textual pseudo-tool JSON is repaired into a declared tool call instead of becoming visible final text', async () => {
  const { createAgentTask, runAgentLoop } = loopModule();
  const task = createAgentTask('conversation-pseudo-tool', request().text, ['app.read', 'patient.search'], '2026-07-25T22:00:00.000Z');
  const port = memoryPort();
  const { executeToolInvocation } = loadCore('src/features/atal-ai/core/executionEngine.js');
  const executeTool = (invocation, confirmation) => executeToolInvocation({ invocation, context: context({ conversationId: 'conversation-pseudo-tool' }), confirmation }, { port });
  let turn = 0;
  const requests = [];

  const outcome = await runAgentLoop({
    task,
    request: request(),
    context: context({ conversationId: 'conversation-pseudo-tool' }),
    requestModel: async (payload) => {
      requests.push(structuredClone(payload));
      turn += 1;
      if (turn === 1) return {
        text: '{"action":"patients.list","action_input":{}}',
        calls: [],
        modelContent: { role: 'model', parts: [{ text: '{"action":"patients.list","action_input":{}}' }] },
      };
      if (turn === 2) return {
        text: '',
        calls: [{ id: 'call-read-patients', bridge: 'atal_read', functionName: 'atal_app_read', tool: 'app.read', input: { resource: 'patients' }, references: [] }],
        modelContent: { role: 'model', parts: [{ functionCall: { id: 'call-read-patients', name: 'atal_app_read', args: { resource: 'patients' } } }] },
      };
      return {
        text: 'Tienes 1 paciente registrado: Paciente Uno.',
        calls: [],
        modelContent: { role: 'model', parts: [{ text: 'Tienes 1 paciente registrado: Paciente Uno.' }] },
      };
    },
    executeTool,
  });

  assert.equal(outcome.task.status, 'completed');
  assert.match(outcome.task.finalText, /Paciente Uno/i);
  assert.equal(outcome.task.completed.length, 1);
  assert.equal(outcome.task.completed[0].invocation.tool, 'app.read');
  assert.equal(requests.length, 3);
  assert.equal(requests[1].history.some((content) => content.parts?.some((part) => typeof part.text === 'string' && part.text.includes('[ATAL_TOOL_CALL_REPAIR]'))), true);
});
