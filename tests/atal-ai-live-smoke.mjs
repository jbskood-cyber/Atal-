import assert from 'node:assert/strict';
import { FunctionCallingConfigMode, GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.log('ATAL_AI_LIVE_SMOKE=SKIPPED_NO_KEY');
  process.exit(0);
}

const model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
const ai = new GoogleGenAI({ apiKey });
const functionDeclaration = {
  name: 'atal_app_read',
  description: 'Consulta información canónica mínima de Atal. Úsala solo cuando la respuesta dependa de datos reales de la aplicación.',
  parametersJsonSchema: {
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
    additionalProperties: false,
  },
};

const conceptual = await ai.models.generateContent({
  model,
  contents: [{ role: 'user', parts: [{ text: '¿Qué es un recurso de lectura compatible? Respóndeme de forma natural.' }] }],
  config: {
    systemInstruction: 'Eres Atal IA. Responde directamente las preguntas conceptuales. No llames herramientas cuando no necesitas datos reales de Atal.',
    maxOutputTokens: 256,
  },
});
assert.equal(conceptual.functionCalls?.length ?? 0, 0, 'Gemini called a tool for a conceptual question.');
assert.ok(conceptual.text?.trim(), 'Gemini did not answer the conceptual question.');

const read = await ai.models.generateContent({
  model,
  contents: [{ role: 'user', parts: [{ text: 'Consulta los ajustes actuales de Atal usando la función disponible. No inventes el resultado.' }] }],
  config: {
    systemInstruction: 'Eres Atal IA. Cuando una respuesta dependa del estado real de Atal, solicita la función precisa y espera su resultado.',
    tools: [{ functionDeclarations: [functionDeclaration] }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ['atal_app_read'] } },
    maxOutputTokens: 256,
  },
});

const call = read.functionCalls?.[0];
assert.ok(call, 'Gemini did not produce a direct function call.');
assert.equal(call.name, 'atal_app_read');
assert.equal(call.args?.resource, 'settings');

const patientCount = await ai.models.generateContent({
  model,
  contents: [{ role: 'user', parts: [{ text: 'Dime cuantos pacientes tengo por favor. Debes consultar Atal antes de responder.' }] }],
  config: {
    systemInstruction: 'Eres Atal IA. Para preguntas sobre datos reales de la aplicación, usa la herramienta disponible y no inventes cifras.',
    tools: [{ functionDeclarations: [functionDeclaration] }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ['atal_app_read'] } },
    maxOutputTokens: 256,
  },
});

const patientCall = patientCount.functionCalls?.[0];
assert.ok(patientCall, 'Gemini did not request Atal data for the patient-count question.');
assert.equal(patientCall.name, 'atal_app_read');
assert.equal(patientCall.args?.resource, 'patients');

console.log(`ATAL_AI_LIVE_SMOKE=PASS model=${model} conceptual=direct settings=atal_app_read patients=atal_app_read`);
