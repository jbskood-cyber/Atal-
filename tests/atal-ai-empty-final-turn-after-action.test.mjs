import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort } from './helpers/core-fixtures.mjs';

const loopModule = () => loadCore('src/features/atal-ai/core/agentic/agentLoop.js');

function request(overrides = {}) {
  return {
    conversationId: 'conversation-empty-after-action',
    text: 'Añade esta nota al paciente y guárdala.',
    route: '/patients/patient-1',
    selectedPatientId: 'patient-1',
    selectedPlanId: 'plan-1',
    selectedExerciseId: 'exercise-1',
    selectedSessionId: 'session-1',
    attachments: [],
    ...overrides,
  };
}

function executor(port) {
  const { executeToolInvocation } = loadCore('src/features/atal-ai/core/executionEngine.js');
  return (invocation, confirmation) => executeToolInvocation({ invocation, context: context(), confirmation }, { port });
}

test('an empty final model turn after a successful action preserves success instead of reporting EMPTY_MODEL_TURN', async () => {
  const { createAgentTask, runAgentLoop } = loopModule();
  const port = memoryPort();
  const task = createAgentTask(
    'conversation-empty-after-action',
    'Añade esta nota al paciente y guárdala.',
    ['patient_note.add'],
    '2026-07-25T05:00:00.000Z',
  );

  let modelTurn = 0;
  const requestModel = async () => {
    modelTurn += 1;
    if (modelTurn === 1) {
      return {
        text: '',
        modelContent: {
          role: 'model',
          parts: [{ functionCall: { id: 'call-note', name: 'atal_action', args: {} } }],
        },
        calls: [{
          id: 'call-note',
          bridge: 'atal_action',
          tool: 'patient_note.add',
          input: {
            patient: { type: 'patient', id: 'patient-1' },
            content: 'Nota guardada desde la conversación.',
          },
          references: [{ type: 'patient', id: 'patient-1' }],
        }],
      };
    }

    return {
      text: '',
      calls: [],
      modelContent: { role: 'model', parts: [] },
    };
  };

  const outcome = await runAgentLoop({
    task,
    request: request(),
    context: context({ conversationId: 'conversation-empty-after-action' }),
    requestModel,
    executeTool: executor(port),
  });

  assert.equal(port.read().notes.length, 1, 'the successful action must remain applied');
  assert.equal(outcome.task.completed.length, 1);
  assert.equal(outcome.task.completed[0].result.status, 'success');
  assert.equal(outcome.task.status, 'completed');
  assert.notEqual(outcome.task.error, 'EMPTY_MODEL_TURN');
  assert.equal(outcome.task.finalText, outcome.task.completed[0].result.message);
});
