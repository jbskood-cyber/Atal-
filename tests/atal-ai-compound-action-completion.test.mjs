import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context } from './helpers/core-fixtures.mjs';

const loopModule = () => loadCore('src/features/atal-ai/core/agentic/agentLoop.js');
const selectionModule = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');
const requirementsModule = () => loadCore('src/features/atal-ai/core/agentic/compoundActionRequirements.js');

const request = {
  conversationId: 'conversation-compound-plan-edit',
  text: 'Cámbiale la frecuencia a 4 veces por semana y al ejercicio Rotación externa Flujo QA ponle 4 series de 10 repeticiones.',
  route: '/assistant',
  selectedPatientId: 'patient-e2e',
  selectedPlanId: 'plan-e2e',
  selectedExerciseId: 'exercise-strength',
  selectedSessionId: '',
  attachments: [],
};

test('explicit compound plan + exercise edits are marked as required actions', () => {
  const input = {
    text: request.text,
    route: request.route,
    intent: 'update_existing_plan',
    selectionHints: '',
    hasImageOrPdf: false,
    hasAudio: false,
    hasConversationContext: true,
  };
  const allowed = selectionModule().selectAgentTools(input);
  const required = requirementsModule().requiredAgentToolsForSelection(input, allowed);

  assert.deepEqual(allowed, ['app.read', 'patient.search', 'plan.update_fields', 'exercise.update_fields']);
  assert.deepEqual(required, ['plan.update_fields', 'exercise.update_fields']);
});

test('isolated plan membership remains required even when analyzer intent is not update_existing_plan', () => {
  const input = {
    text: 'Añade a este plan los ejercicios Movilidad asistida E2E y Rotación externa Flujo QA.',
    route: '/assistant',
    intent: 'summarize_patient',
    selectionHints: '',
    hasImageOrPdf: false,
    hasAudio: false,
    hasConversationContext: true,
  };
  const allowed = ['app.read', 'patient.search', 'plan.membership'];
  const required = requirementsModule().requiredAgentToolsForSelection(input, allowed);

  assert.deepEqual(required, ['plan.membership']);
});

test('agent cannot finish a compound request after applying only one explicitly required mutation', async () => {
  const { createAgentTask, runAgentLoop } = loopModule();
  const task = createAgentTask(
    request.conversationId,
    request.text,
    ['app.read', 'patient.search', 'plan.update_fields', 'exercise.update_fields'],
    '2026-07-27T02:20:00.000Z',
    ['plan.update_fields', 'exercise.update_fields'],
  );

  let turn = 0;
  const executed = [];
  const outcome = await runAgentLoop({
    task,
    request,
    context: context({
      conversationId: request.conversationId,
      selectedPatientId: request.selectedPatientId,
      selectedPlanId: request.selectedPlanId,
      selectedExerciseId: request.selectedExerciseId,
    }),
    requestModel: async (modelRequest) => {
      turn += 1;
      if (turn === 1) {
        return {
          text: '',
          calls: [{
            id: 'call-plan-update',
            bridge: 'atal_action',
            functionName: 'atal_plan_update_fields',
            tool: 'plan.update_fields',
            input: { plan: { type: 'plan', id: 'plan-e2e' }, patch: { frequency: '4 veces por semana' } },
            references: [{ type: 'plan', id: 'plan-e2e' }],
          }],
        };
      }
      if (turn === 2) {
        return { text: 'Listo, actualicé el plan.', calls: [] };
      }
      if (turn === 3) {
        assert.deepEqual(modelRequest.allowedTools, ['app.read', 'patient.search', 'exercise.update_fields']);
        return {
          text: '',
          calls: [{
            id: 'call-exercise-update',
            bridge: 'atal_action',
            functionName: 'atal_exercise_update_fields',
            tool: 'exercise.update_fields',
            input: { exercise: { type: 'exercise', id: 'exercise-strength' }, patch: { sets: 4, repetitions: 10 } },
            references: [{ type: 'exercise', id: 'exercise-strength' }],
          }],
        };
      }
      return { text: 'Listo, actualicé la frecuencia y la dosis del ejercicio.', calls: [] };
    },
    executeTool: (invocation) => {
      executed.push(invocation.tool);
      return {
        status: 'success',
        message: invocation.tool === 'plan.update_fields' ? 'Datos del plan actualizados.' : 'Ejercicio actualizado.',
        effects: [],
      };
    },
  });

  assert.equal(turn, 4);
  assert.deepEqual(executed, ['plan.update_fields', 'exercise.update_fields']);
  assert.equal(outcome.task.status, 'completed');
  assert.equal(outcome.task.error, undefined);
  assert.match(outcome.task.finalText, /frecuencia.*dosis|dosis.*frecuencia/i);
});