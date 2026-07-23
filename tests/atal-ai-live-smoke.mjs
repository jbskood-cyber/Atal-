import assert from 'node:assert/strict';
import { FunctionCallingConfigMode, GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.log('ATAL_AI_LIVE_SMOKE=SKIPPED_NO_KEY');
  process.exit(0);
}

const model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model,
  contents: [{
    role: 'user',
    parts: [{ text: 'Consulta los ajustes actuales de Atal usando la herramienta disponible. No inventes el resultado.' }],
  }],
  config: {
    systemInstruction: 'Eres Atal IA. Para consultar datos de Atal debes llamar la función disponible y esperar su resultado.',
    tools: [{
      functionDeclarations: [{
        name: 'atal_read',
        description: 'Solicita una lectura determinista de Atal.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            tool: { type: 'string', enum: ['app.read'] },
            input: {
              type: 'object',
              properties: { resource: { type: 'string', enum: ['settings'] } },
              required: ['resource'],
            },
            references: { type: 'array', items: { type: 'object' } },
          },
          required: ['tool', 'input', 'references'],
        },
      }],
    }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ['atal_read'] } },
    maxOutputTokens: 256,
  },
});

const call = response.functionCalls?.[0];
assert.ok(call, 'Gemini did not produce a function call.');
assert.equal(call.name, 'atal_read');
assert.equal(call.args?.tool, 'app.read');
assert.equal(call.args?.input?.resource, 'settings');
assert.deepEqual(call.args?.references, []);
console.log(`ATAL_AI_LIVE_SMOKE=PASS model=${model}`);
