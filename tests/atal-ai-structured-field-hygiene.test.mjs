import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const prompt = () => loadCore('src/features/atal-ai/api/agentPrompt.js').ATAL_AGENT_SYSTEM_PROMPT;

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
