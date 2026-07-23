import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort } from './helpers/core-fixtures.mjs';

const loopModule = () => loadCore('src/features/atal-ai/core/agentic/agentLoop.js');
const selectionModule = () => loadCore('src/features/atal-ai/core/agentic/toolSelection.js');

function request(overrides = {}) {
  return {
    conversationId: 'conversation-1',
    text: 'Añade una nota al paciente y después consulta su perfil.',
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

test('tool selection stays bounded and includes contextual patient and plan tools', () => {
  const tools = selectionModule().selectAgentTools({ text: 'Actualiza el plan del paciente y añade un ejercicio', route: '/patients/patient-1', hasImageOrPdf: false, hasAudio: false });
  assert.ok(tools.length <= selectionModule().AGENT_MAX_ACTIVE_TOOLS);
  assert.equal(tools.includes('app.read'), true);
  assert.equal(tools.includes('patient.update'), true);
  assert.equal(tools.includes('plan.update_fields'), true);
  assert.equal(tools.includes('exercise.create_simple'), true);
});

test('ordinary conversation stays read-only instead of defaulting to patient mutations', () => {
  const tools = selectionModule().selectAgentTools({
    text: 'Hola, explícame con calma qué puedes hacer por mí.',
    route: '/assistant',
    hasImageOrPdf: false,
    hasAudio: false,
  });
  assert.equal(tools.includes('app.read'), true);
  assert.equal(tools.includes('patient.update'), false);
  assert.equal(tools.includes('patient.create'), false);
  assert.equal(tools.includes('clinical_record.upsert'), false);
});

test('a descriptive image question does not expose clinical mutation tools', () => {
  const tools = selectionModule().selectAgentTools({
    text: '¿Qué es esto?',
    route: '/assistant',
    hasImageOrPdf: true,
    hasAudio: false,
  });
  assert.equal(tools.includes('patient.update'), false);
  assert.equal(tools.includes('clinical_record.upsert'), false);
  assert.equal(tools.includes('exercise.create_simple'), false);
  assert.equal(tools.includes('exercise.media'), false);
});

test('explicit no-apply wording keeps a contact update as a proposal without mutation tools', () => {
  const tools = selectionModule().selectAgentTools({
    text: 'Ayúdame a preparar una actualización de los datos de contacto. No apliques cambios todavía.',
    route: '/assistant',
    intent: 'update_patient_record',
    hasImageOrPdf: false,
    hasAudio: false,
  });
  assert.equal(tools.includes('app.read'), true);
  assert.equal(tools.includes('patient.update'), false);
  assert.equal(tools.includes('clinical_record.upsert'), false);
});

test('an explicit contact mutation still exposes the canonical patient update tool', () => {
  const tools = selectionModule().selectAgentTools({
    text: 'Actualiza el teléfono del paciente a 4441234567 y guárdalo.',
    route: '/assistant',
    intent: 'update_patient_record',
    hasImageOrPdf: false,
    hasAudio: false,
  });
  assert.equal(tools.includes('patient.update'), true);
});

test('bounded loop executes safe multi-step work and returns grounded final text', async () => {
  const { createAgentTask, runAgentLoop } = loopModule();
  const allowedTools = ['patient_note.add', 'app.read'];
  const task = createAgentTask('conversation-1', request().text, allowedTools, '2026-07-21T18:00:00.000Z');
  const port = memoryPort();
  let modelTurn = 0;
  const requestModel = async () => {
    modelTurn += 1;
    if (modelTurn === 1) return {
      text: '',
      modelContent: { role: 'model', parts: [{ functionCall: { id: 'call-note', name: 'atal_action', args: {} } }] },
      calls: [{ id: 'call-note', bridge: 'atal_action', tool: 'patient_note.add', input: { patient: { type: 'patient', id: 'patient-1' }, content: 'Mejor tolerancia.' }, references: [{ type: 'patient', id: 'patient-1' }] }],
    };
    if (modelTurn === 2) return {
      text: '',
      modelContent: { role: 'model', parts: [{ functionCall: { id: 'call-read', name: 'atal_read', args: {} } }] },
      calls: [{ id: 'call-read', bridge: 'atal_read', tool: 'app.read', input: { resource: 'patient_profile', patient: { type: 'patient', id: 'patient-1' }, limit: 5 }, references: [{ type: 'patient', id: 'patient-1' }] }],
    };
    return { text: 'Listo. Añadí la nota y comprobé el perfil del paciente.', calls: [], modelContent: { role: 'model', parts: [{ text: 'Listo.' }] } };
  };
  const outcome = await runAgentLoop({ task, request: request(), context: context(), requestModel, executeTool: executor(port) });
  assert.equal(outcome.task.status, 'completed');
  assert.equal(outcome.task.completed.length, 2);
  assert.equal(port.read().notes[0].content, 'Mejor tolerancia.');
  assert.match(outcome.task.finalText, /Añadí la nota/);
});

test('loop pauses only at a sensitive boundary after preserving safe completed work', async () => {
  const { createAgentTask, runAgentLoop } = loopModule();
  const task = createAgentTask('conversation-1', 'Añade una nota y archiva al paciente', ['patient_note.add', 'patient.lifecycle'], '2026-07-21T18:00:00.000Z');
  const port = memoryPort();
  const requestModel = async () => ({
    text: '',
    modelContent: { role: 'model', parts: [] },
    calls: [
      { id: 'call-safe', bridge: 'atal_action', tool: 'patient_note.add', input: { patient: { type: 'patient', id: 'patient-1' }, content: 'Nota segura.' }, references: [{ type: 'patient', id: 'patient-1' }] },
      { id: 'call-sensitive', bridge: 'atal_action', tool: 'patient.lifecycle', input: { patient: { type: 'patient', id: 'patient-1' }, archived: true }, references: [{ type: 'patient', id: 'patient-1' }] },
    ],
  });
  const outcome = await runAgentLoop({ task, request: request({ text: 'Añade una nota y archiva al paciente' }), context: context(), requestModel, executeTool: executor(port) });
  assert.equal(outcome.task.status, 'needs-confirmation');
  assert.equal(port.read().notes.length, 1);
  assert.equal(port.read().patients[0].status, 'active');
  assert.equal(outcome.task.pendingInvocation.tool, 'patient.lifecycle');
});

test('file-derived changes require compact review and duplicate calls stop safely', async () => {
  const { createAgentTask, runAgentLoop } = loopModule();
  const port = memoryPort();
  const task = createAgentTask('conversation-1', 'Actualiza el diagnóstico de esta foto', ['patient.update'], '2026-07-21T18:00:00.000Z');
  const call = { id: 'call-file', bridge: 'atal_action', tool: 'patient.update', input: { patient: { type: 'patient', id: 'patient-1' }, patch: { diagnosis: 'Extraído' } }, references: [{ type: 'patient', id: 'patient-1' }] };
  const fileOutcome = await runAgentLoop({
    task,
    request: request({ text: 'Actualiza el diagnóstico de esta foto', attachments: [{ id: 'a1', name: 'foto.jpg', type: 'image/jpeg', kind: 'image' }] }),
    context: context(),
    requestModel: async () => ({ text: '', calls: [call], modelContent: { role: 'model', parts: [] } }),
    executeTool: executor(port),
  });
  assert.equal(fileOutcome.task.status, 'needs-confirmation');
  assert.equal(fileOutcome.task.completed[0].result.decision.mode, 'review');
  assert.equal(port.read().patients[0].diagnosis, '');

  const duplicateTask = createAgentTask('conversation-2', 'Repite', ['app.read'], '2026-07-21T18:00:00.000Z');
  let turns = 0;
  const duplicateOutcome = await runAgentLoop({
    task: duplicateTask,
    request: request({ conversationId: 'conversation-2', text: 'Repite' }),
    context: context({ conversationId: 'conversation-2' }),
    requestModel: async () => {
      turns += 1;
      return { text: '', calls: [{ id: `repeat-${turns}`, bridge: 'atal_read', tool: 'app.read', input: { resource: 'settings' }, references: [] }], modelContent: { role: 'model', parts: [] } };
    },
    executeTool: executor(port),
  });
  assert.equal(duplicateOutcome.task.status, 'failed');
  assert.equal(duplicateOutcome.task.error, 'DUPLICATE_TOOL_CALL');
});
