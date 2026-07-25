import assert from 'node:assert/strict';
import { FunctionCallingConfigMode, GoogleGenAI } from '@google/genai';
import { loadCore } from './helpers/core-modules.mjs';
import { context, memoryPort } from './helpers/core-fixtures.mjs';

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.log('ATAL_AI_LIVE_E2E=SKIPPED_NO_KEY');
  process.exit(0);
}

const configuredCascade = process.env.GEMINI_MODEL_CASCADE?.trim();
const preferredModel = process.env.GEMINI_MODEL?.trim();
const models = [...new Set((configuredCascade
  ? configuredCascade.split(',')
  : [preferredModel, 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'])
  .map((value) => value?.trim())
  .filter(Boolean))];

const ai = new GoogleGenAI({ apiKey });
const { agentToolCatalogByName } = loadCore('src/features/atal-ai/api/agentToolCatalog.js');
const { ATAL_AGENT_SYSTEM_PROMPT } = loadCore('src/features/atal-ai/api/agentPrompt.js');
const { executeToolInvocation } = loadCore('src/features/atal-ai/core/executionEngine.js');

const patientTool = agentToolCatalogByName.get('patient.create');
assert.ok(patientTool, 'patient.create is missing from the agent catalog.');

const functionDeclaration = {
  name: patientTool.functionName,
  description: `${patientTool.contract} Atal validará los datos, el riesgo, la persistencia, la auditoría y Deshacer.`,
  parameters: patientTool.inputSchema,
};

function isTransient(error) {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  if (/\b(?:401|403)\b|API key|permission denied|PERMISSION_DENIED|INVALID_ARGUMENT|invalid argument/i.test(message)) return false;
  return /\b429\b|RESOURCE_EXHAUSTED|quota|rate limit|too many requests|\b503\b|UNAVAILABLE|overload|temporar(?:y|ily)|timed? out|timeout|fetch failed|network/i.test(message);
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
      await sleep(500 * (2 ** index));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini live E2E failed.');
}

async function continueWithSameModel(model, request) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await ai.models.generateContent({ ...request, model });
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === 2) throw error;
      await sleep(32_000);
    }
  }
  throw lastError;
}

const conversation = [
  {
    role: 'user',
    parts: [{ text: 'Quiero registrar un paciente nuevo. Se llama Nicolás Morales, nació el 4 de octubre de 2008, sexo masculino, teléfono 4445679812. Es primera consulta por dolor lumbar después de una caída jugando fútbol hace dos semanas.' }],
  },
  {
    role: 'model',
    parts: [{ text: 'Tengo los datos para registrar a Nicolás Morales con expediente inicial. ¿Quieres que lo guarde ahora?' }],
  },
  {
    role: 'user',
    parts: [{ text: 'Por favor guárdalo.' }],
  },
];

const { value: first, model } = await withModelFallback((candidateModel) => ai.models.generateContent({
  model: candidateModel,
  contents: conversation,
  config: {
    systemInstruction: ATAL_AGENT_SYSTEM_PROMPT,
    tools: [{ functionDeclarations: [functionDeclaration] }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: [patientTool.functionName] } },
    maxOutputTokens: 2_048,
  },
}));

const call = first.functionCalls?.[0];
assert.ok(call, 'Gemini did not call patient.create after the natural confirmation.');
assert.equal(call.name, patientTool.functionName);
assert.equal(call.args?.patient?.name, 'Nicolás Morales');
assert.equal(call.args?.patient?.phone, '4445679812');

const providerModelContent = first.candidates?.[0]?.content;
assert.ok(providerModelContent?.parts?.some((part) => part.functionCall), 'Gemini function-call content was not preserved.');
const hasThoughtSignature = providerModelContent.parts.some((part) => typeof part.thoughtSignature === 'string' && part.thoughtSignature.length > 0);

const port = memoryPort();
const invocation = {
  tool: 'patient.create',
  version: 1,
  input: call.args ?? {},
  references: [],
  proposalId: call.id || 'live-patient-create',
  authorization: 'explicit-user-request',
};
const executionContext = context({
  conversationId: 'live-gemini-patient-create',
  draftId: 'live-gemini-draft',
  route: '/assistant',
  selectedPatientId: '',
  selectedPlanId: '',
  selectedExerciseId: '',
  selectedSessionId: '',
  now: new Date().toISOString(),
});
const result = executeToolInvocation({ invocation, context: executionContext }, { port });
assert.equal(result.status, 'success', result.status === 'error' ? result.message : `Unexpected tool result: ${result.status}`);

const created = port.read().patients.find((patient) => patient.name === 'Nicolás Morales');
assert.ok(created, 'patient.create reported success but the patient is absent from the canonical state.');
assert.equal(created.contact.phone, '4445679812');
const record = port.read().clinicalRecords.find((item) => item.patientId === created.id);
assert.ok(record, 'patient.create did not persist the initial clinical record.');

const functionResponse = {
  role: 'user',
  parts: [{
    functionResponse: {
      id: call.id,
      name: call.name,
      response: { output: result },
    },
  }],
};

const final = await continueWithSameModel(model, {
  contents: [...conversation, providerModelContent, functionResponse],
  config: {
    systemInstruction: ATAL_AGENT_SYSTEM_PROMPT,
    tools: [{ functionDeclarations: [functionDeclaration] }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
    maxOutputTokens: 2_048,
  },
});

assert.ok(final.text?.trim(), 'Gemini returned an empty final turn after a successful patient.create.');
assert.equal(final.functionCalls?.length ?? 0, 0, 'Gemini repeated patient.create after the successful tool result.');

console.log(`ATAL_AI_LIVE_E2E=PASS model=${model} patient_created=true record_created=true final_text=true thought_signature=${hasThoughtSignature}`);
