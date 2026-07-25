import assert from 'node:assert/strict';
import { FunctionCallingConfigMode, GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.log('ATAL_AI_LIVE_SMOKE=SKIPPED_NO_KEY');
  process.exit(0);
}

const configuredCascade = process.env.GEMINI_MODEL_CASCADE?.trim();
const preferredModel = process.env.GEMINI_MODEL?.trim();
const models = [...new Set((configuredCascade
  ? configuredCascade.split(',')
  : [preferredModel, 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'])
  .map((value) => value?.trim())
  .filter(Boolean))];
const stage = process.env.ATAL_AI_LIVE_STAGE?.trim() || 'patients';
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

function isTransient(error) {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  if (/\b(?:401|403)\b|API key|permission denied|PERMISSION_DENIED|INVALID_ARGUMENT|invalid argument/i.test(message)) return false;
  return /\b429\b|RESOURCE_EXHAUSTED|quota|rate limit|too many requests|\b503\b|UNAVAILABLE|overload|temporar(?:y|ily)|timed? out|timeout|fetch failed|network/i.test(message);
}

async function withModelFallback(operation) {
  let lastError;
  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    try {
      return { value: await operation(model), model };
    } catch (error) {
      lastError = error;
      const nextModel = models[index + 1];
      if (!nextModel || !isTransient(error)) throw error;
      console.log(`ATAL_AI_LIVE_FALLBACK failed=${model} next=${nextModel}`);
      await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** index)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini live smoke failed.');
}

async function conceptual() {
  const { value: response, model } = await withModelFallback((candidateModel) => ai.models.generateContent({
    model: candidateModel,
    contents: [{ role: 'user', parts: [{ text: '¿Qué es un recurso de lectura compatible? Respóndeme de forma natural.' }] }],
    config: {
      systemInstruction: 'Eres Atal IA. Responde directamente las preguntas conceptuales. No llames herramientas cuando no necesitas datos reales de Atal.',
      maxOutputTokens: 2_048,
    },
  }));
  assert.equal(response.functionCalls?.length ?? 0, 0, 'Gemini called a tool for a conceptual question.');
  assert.ok(response.text?.trim(), 'Gemini did not answer the conceptual question.');
  console.log(`ATAL_AI_LIVE_STAGE=conceptual PASS model=${model}`);
}

async function forcedCall(prompt) {
  const { value: response, model } = await withModelFallback((candidateModel) => ai.models.generateContent({
    model: candidateModel,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction: 'Eres Atal IA. Cuando una respuesta dependa del estado real de Atal, solicita la función precisa y espera su resultado.',
      tools: [{ functionDeclarations: [functionDeclaration] }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ['atal_app_read'] } },
      maxOutputTokens: 2_048,
    },
  }));
  const call = response.functionCalls?.[0];
  assert.ok(call, 'Gemini did not produce a direct function call.');
  assert.equal(call.name, 'atal_app_read');
  console.log(`ATAL_AI_LIVE_CALL name=${call.name} resource=${String(call.args?.resource ?? '')} model=${model}`);
  return { call, model };
}

async function callPresence() {
  const { model } = await forcedCall('Consulta los ajustes actuales de Atal usando la función disponible. No inventes el resultado.');
  console.log(`ATAL_AI_LIVE_STAGE=call-presence PASS model=${model}`);
}

async function settingsArgs() {
  const { call, model } = await forcedCall('Consulta los ajustes actuales de Atal usando la función disponible. No inventes el resultado.');
  assert.equal(call.args?.resource, 'settings');
  console.log(`ATAL_AI_LIVE_STAGE=settings PASS model=${model}`);
}

async function patientsArgs() {
  const { call, model } = await forcedCall('Dime cuantos pacientes tengo por favor. Debes consultar Atal antes de responder.');
  assert.equal(call.args?.resource, 'patients');
  console.log(`ATAL_AI_LIVE_STAGE=patients PASS model=${model}`);
}

const stages = {
  conceptual,
  'call-presence': callPresence,
  settings: settingsArgs,
  patients: patientsArgs,
};

const run = stages[stage];
if (!run) throw new Error(`Unknown live smoke stage: ${stage}`);
await run();
console.log(`ATAL_AI_LIVE_SMOKE=PASS stage=${stage}`);
