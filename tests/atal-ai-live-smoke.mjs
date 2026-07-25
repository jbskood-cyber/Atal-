import assert from 'node:assert/strict';
import { FunctionCallingConfigMode, GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.log('ATAL_AI_LIVE_SMOKE=SKIPPED_NO_KEY');
  process.exit(0);
}

const model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
const stage = process.env.ATAL_AI_LIVE_STAGE?.trim() || 'all';
const ai = new GoogleGenAI({ apiKey });
const functionDeclaration = {
  name: 'atal_app_read',
  description: 'Consulta información canónica mínima de Atal. Úsala solo cuando la respuesta dependa de datos reales de la aplicación.',
  parameters: {
    type: 'object',
    properties: {
      resource: {
        type: 'string',
        enum: ['patients', 'patient_profile', 'clinical_record', 'plans', 'plan', 'exercises', 'exercise', 'sessions', 'report', 'activity', 'settings', 'delivery'],
      },
      query: { type: 'string' },
      status: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 50 },
    },
    required: ['resource'],
  },
};

async function conceptual() {
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: '¿Qué es un recurso de lectura compatible? Respóndeme de forma natural.' }] }],
    config: {
      systemInstruction: 'Eres Atal IA. Responde directamente las preguntas conceptuales. No llames herramientas cuando no necesitas datos reales de Atal.',
      maxOutputTokens: 2_048,
    },
  });
  assert.equal(response.functionCalls?.length ?? 0, 0, 'Gemini called a tool for a conceptual question.');
  assert.ok(response.text?.trim(), 'Gemini did not answer the conceptual question.');
  console.log(`ATAL_AI_LIVE_STAGE=conceptual PASS model=${model}`);
}

async function forcedCall(prompt) {
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction: 'Eres Atal IA. Cuando una respuesta dependa del estado real de Atal, solicita la función precisa y espera su resultado.',
      tools: [{ functionDeclarations: [functionDeclaration] }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ['atal_app_read'] } },
      maxOutputTokens: 2_048,
    },
  });
  const call = response.functionCalls?.[0];
  assert.ok(call, 'Gemini did not produce a direct function call.');
  assert.equal(call.name, 'atal_app_read');
  console.log(`ATAL_AI_LIVE_CALL name=${call.name} resource=${String(call.args?.resource ?? '')}`);
  return call;
}

async function callPresence() {
  await forcedCall('Consulta los ajustes actuales de Atal usando la función disponible. No inventes el resultado.');
  console.log(`ATAL_AI_LIVE_STAGE=call-presence PASS model=${model}`);
}

async function settingsArgs() {
  const call = await forcedCall('Consulta los ajustes actuales de Atal usando la función disponible. No inventes el resultado.');
  assert.equal(call.args?.resource, 'settings');
  console.log(`ATAL_AI_LIVE_STAGE=settings PASS model=${model}`);
}

async function patientsArgs() {
  const call = await forcedCall('Dime cuantos pacientes tengo por favor. Debes consultar Atal antes de responder.');
  assert.equal(call.args?.resource, 'patients');
  console.log(`ATAL_AI_LIVE_STAGE=patients PASS model=${model}`);
}

const stages = {
  conceptual,
  'call-presence': callPresence,
  settings: settingsArgs,
  patients: patientsArgs,
};

if (stage === 'all') {
  for (const run of Object.values(stages)) await run();
  console.log(`ATAL_AI_LIVE_SMOKE=PASS model=${model}`);
} else {
  const run = stages[stage];
  if (!run) throw new Error(`Unknown live smoke stage: ${stage}`);
  await run();
}
