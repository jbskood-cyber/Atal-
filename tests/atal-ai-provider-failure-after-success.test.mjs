import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context } from './helpers/core-fixtures.mjs';

const loopModule = () => loadCore('src/features/atal-ai/core/agentic/agentLoop.js');

function request() {
  return {
    conversationId: 'conversation-provider-failure-after-success',
    text: 'Añade una nota clínica al paciente seleccionado.',
    route: '/assistant',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: '',
    selectedExerciseId: '',
    selectedSessionId: '',
    attachments: [],
  };
}

test('provider failure after a successful tool call preserves the successful result instead of reporting the whole request as failed', async () => {
  const { createAgentTask, runAgentLoop } = loopModule();
  const task = createAgentTask(
    request().conversationId,
    request().text,
    ['patient_note.add'],
    '2026-07-25T23:00:00.000Z',
  );
  let turn = 0;

  const outcome = await runAgentLoop({
    task,
    request: request(),
    context: context({ conversationId: request().conversationId }),
    requestModel: async () => {
      turn += 1;
      if (turn === 1) return {
        text: '',
        calls: [{
          id: 'call-add-note',
          bridge: 'atal_action',
          functionName: 'atal_patient_note_add',
          tool: 'patient_note.add',
          input: { patientId: 'patient-e2e', content: 'Nota sintética de QA.' },
          references: [],
        }],
        modelContent: {
          role: 'model',
          parts: [{ functionCall: { id: 'call-add-note', name: 'atal_patient_note_add', args: { patientId: 'patient-e2e', content: 'Nota sintética de QA.' } } }],
        },
      };
      throw new Error('429 RESOURCE_EXHAUSTED: synthetic provider failure after tool success');
    },
    executeTool: () => ({
      status: 'success',
      message: 'Nota clínica añadida correctamente.',
      effects: [],
    }),
  });

  assert.equal(turn, 2);
  assert.equal(outcome.task.completed.length, 1);
  assert.equal(outcome.task.completed[0].result.status, 'success');
  assert.equal(outcome.task.status, 'completed');
  assert.equal(outcome.task.error, undefined);
  assert.equal(outcome.task.finalText, 'Nota clínica añadida correctamente.');
});
