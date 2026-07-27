import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const prompt = () => loadCore('src/features/atal-ai/api/agentPrompt.js').ATAL_AGENT_SYSTEM_PROMPT;
const catalog = () => loadCore('src/features/atal-ai/api/agentToolCatalog.js').agentToolCatalog;

const tool = (name) => {
  const entry = catalog().find((item) => item.name === name);
  assert.ok(entry, `missing tool ${name}`);
  return entry;
};

test('agent prompt requires field-pure structured values', () => {
  const value = prompt();
  assert.match(value, /campos estructurados/i);
  assert.match(value, /nombre[^\n]+solo el nombre/i);
  assert.match(value, /instrucciones[^\n]+solo instrucciones/i);
  assert.match(value, /series|repeticiones/i);
  assert.match(value, /frecuencia/i);
  assert.match(value, /precauciones/i);
  assert.match(value, /no mezcles/i);
});

test('agent prompt explicitly rejects narrative wrappers in structured fields', () => {
  const value = prompt();
  assert.match(value, /Francisco/);
  assert.match(value, /El nombre del paciente es Francisco/);
  assert.match(value, /no guardes/i);
});

test('tool schemas reinforce field purity at the function-calling boundary', () => {
  const patientCreate = tool('patient.create');
  const patient = patientCreate.inputSchema.properties.patient;
  assert.match(patient.properties.name.description, /solo el nombre/i);
  assert.match(patient.properties.name.description, /sin frases/i);

  const record = patientCreate.inputSchema.properties.record;
  assert.match(record.properties.reasonForVisit.description, /solo el motivo/i);
  assert.match(record.properties.affectedArea.description, /solo la zona/i);
  assert.match(record.properties.providedDiagnosis.description, /solo el diagnóstico/i);

  const exerciseCreate = tool('exercise.create_simple');
  assert.match(exerciseCreate.inputSchema.properties.name.description, /solo el nombre/i);
  assert.match(exerciseCreate.inputSchema.properties.region.description, /solo la región/i);
  assert.match(exerciseCreate.inputSchema.properties.category.description, /solo la categoría/i);
  assert.match(exerciseCreate.inputSchema.properties.objective.description, /solo el objetivo/i);
  assert.match(exerciseCreate.inputSchema.properties.startingPosition.description, /solo la posición/i);
  assert.match(exerciseCreate.inputSchema.properties.instructions.description, /solo pasos|solo instrucciones/i);
  assert.match(exerciseCreate.inputSchema.properties.instructions.description, /no incluyas series/i);
  assert.match(exerciseCreate.inputSchema.properties.instructions.description, /repeticiones/i);
  assert.match(exerciseCreate.inputSchema.properties.instructions.description, /precauciones/i);
  assert.match(exerciseCreate.inputSchema.properties.precautions.description, /solo precauciones/i);

  const planCreate = tool('plan.create_simple');
  assert.match(planCreate.inputSchema.properties.title.description, /solo el título/i);
  assert.match(planCreate.inputSchema.properties.focus.description, /solo el enfoque/i);
  assert.match(planCreate.inputSchema.properties.duration.description, /solo la duración/i);
  assert.match(planCreate.inputSchema.properties.frequency.description, /solo la frecuencia/i);
  assert.match(planCreate.inputSchema.properties.goal.description, /solo el objetivo/i);
  assert.match(planCreate.inputSchema.properties.progression.description, /solo la progresión/i);
  assert.match(planCreate.inputSchema.properties.reportCriteria.description, /solo criterios/i);
  assert.match(planCreate.inputSchema.properties.generalInstructions.description, /solo indicaciones generales/i);
});
