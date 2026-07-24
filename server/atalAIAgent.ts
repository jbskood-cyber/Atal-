import type { IncomingMessage, ServerResponse } from 'node:http';
import { FunctionCallingConfigMode, GoogleGenAI } from '@google/genai';
import { ATAL_AGENT_SYSTEM_PROMPT } from '../src/features/atal-ai/api/agentPrompt';
import {
  agentToolCatalogByFunctionName,
  agentToolCatalogByName,
  type AgentToolCatalogEntry,
} from '../src/features/atal-ai/api/agentToolCatalog';
import type { AgentFunctionCall, AgentHistoryContent, AgentModelTurn, AgentTurnRequest } from '../src/features/atal-ai/core/agentic/contracts';
import { AGENT_MAX_ACTIVE_TOOLS } from '../src/features/atal-ai/core/agentic/toolSelection';
import { MAX_AI_REQUEST_BODY_BYTES } from '../src/features/atal-ai/domain/attachmentLimits';

const MAX_HISTORY_CONTENTS = 32;
const MAX_CONVERSATION_CONTENTS = 24;
const ENTITY_TYPES = new Set(['patient', 'plan', 'exercise', 'session', 'clinical-record', 'settings']);

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

function writeNdjson(response: ServerResponse, body: unknown) {
  response.write(`${JSON.stringify(body)}\n`);
}

async function readJson(request: IncomingMessage): Promise<AgentTurnRequest> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_AI_REQUEST_BODY_BYTES) throw new Error('La solicitud supera el límite seguro de envío.');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as AgentTurnRequest;
}

function cleanDataUrl(data: string) {
  const comma = data.indexOf(',');
  return comma >= 0 ? data.slice(comma + 1) : data;
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/API key|GEMINI_API_KEY|403|401/i.test(message)) return 'Atal IA no está configurada todavía. Añade GEMINI_API_KEY como secreto del proyecto.';
  if (/quota|429/i.test(message)) return 'Gemini alcanzó temporalmente su límite. El trabajo completado sigue guardado.';
  if (/CORE_INPUT_INVALID|schema|function call|response|JSON/i.test(message)) return 'No pude completar esa consulta con la información disponible. Puedes reformularla o decirme qué necesitas revisar.';
  if (/CORE_ENTITY_NOT_FOUND/i.test(message)) return 'No encontré una entidad que coincida con la solicitud.';
  if (/TOOL_NOT_ALLOWED/i.test(message)) return 'Esa acción no está disponible desde este contexto.';
  return message || 'Gemini no pudo continuar esta tarea. El trabajo completado sigue guardado.';
}

function validatePayload(payload: AgentTurnRequest): AgentTurnRequest {
  if (!payload || typeof payload !== 'object') throw new Error('La solicitud del agente no es válida.');
  if (typeof payload.conversationId !== 'string' || !payload.conversationId.trim()) throw new Error('Falta la conversación del agente.');
  if (typeof payload.text !== 'string' || payload.text.length > 30_000) throw new Error('El mensaje no es válido.');
  if (!Array.isArray(payload.allowedTools) || payload.allowedTools.length > AGENT_MAX_ACTIVE_TOOLS) throw new Error('La selección de herramientas no es válida.');
  const conversationHistory = Array.isArray(payload.conversationHistory) ? payload.conversationHistory : [];
  if (conversationHistory.length > MAX_CONVERSATION_CONTENTS) throw new Error('La conversación supera el límite seguro.');
  if (!Array.isArray(payload.history) || payload.history.length > MAX_HISTORY_CONTENTS) throw new Error('El historial de la tarea supera el límite seguro.');
  if (!Array.isArray(payload.attachments) || payload.attachments.length > 8) throw new Error('La solicitud contiene demasiados archivos.');
  const allowedTools = [...new Set(payload.allowedTools)];
  for (const tool of allowedTools) if (!agentToolCatalogByName.has(tool)) throw new Error(`Herramienta no autorizada: ${tool}`);
  return { ...payload, allowedTools, conversationHistory };
}

function toolDeclaration(entry: AgentToolCatalogEntry) {
  return {
    name: entry.functionName,
    description: `${entry.contract} Atal validará los datos, el riesgo, la persistencia, la auditoría y Deshacer.`,
    parametersJsonSchema: entry.inputSchema,
  };
}

function initialUserContent(payload: AgentTurnRequest): AgentHistoryContent {
  const parts: Array<Record<string, unknown>> = [];
  for (const attachment of payload.attachments) {
    if (!attachment.data) continue;
    parts.push({ inlineData: { mimeType: attachment.type, data: cleanDataUrl(attachment.data) } });
  }
  const context = [
    `Ruta actual: ${payload.route || '/'}`,
    payload.selectedPatientId ? `Paciente seleccionado: ${payload.selectedPatientId}` : '',
    payload.selectedPlanId ? `Plan seleccionado: ${payload.selectedPlanId}` : '',
    payload.selectedExerciseId ? `Ejercicio seleccionado: ${payload.selectedExerciseId}` : '',
    payload.selectedSessionId ? `Sesión seleccionada: ${payload.selectedSessionId}` : '',
  ].filter(Boolean).join('\n');
  parts.push({ text: `${context}\n\nSolicitud del fisioterapeuta:\n${payload.text.trim() || '(continúa la tarea pendiente)'}` });
  return { role: 'user', parts };
}

function collectReferences(value: unknown): AgentFunctionCall['references'] {
  const references: AgentFunctionCall['references'] = [];
  const seen = new Set<string>();
  const visit = (candidate: unknown) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (!candidate || typeof candidate !== 'object') return;
    const record = candidate as Record<string, unknown>;
    const type = typeof record.type === 'string' ? record.type : '';
    const id = typeof record.id === 'string' ? record.id : undefined;
    const label = typeof record.label === 'string' ? record.label : undefined;
    if (ENTITY_TYPES.has(type) && (id?.trim() || label?.trim())) {
      const key = `${type}:${id ?? ''}:${label ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        references.push({ type, id, label });
      }
    }
    Object.values(record).forEach(visit);
  };
  visit(value);
  return references;
}

function modelCall(call: { id?: string; name?: string; args?: Record<string, unknown> }, allowedFunctions: Map<string, AgentToolCatalogEntry>): AgentFunctionCall {
  const functionName = call.name ?? '';
  const entry = allowedFunctions.get(functionName) ?? agentToolCatalogByFunctionName.get(functionName);
  if (!entry || !allowedFunctions.has(functionName)) throw new Error(`Gemini solicitó una herramienta no permitida: ${functionName || 'desconocida'}`);
  const input = call.args && typeof call.args === 'object' ? call.args : {};
  return {
    id: call.id || `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bridge: entry.kind === 'read' ? 'atal_read' : 'atal_action',
    functionName: entry.functionName,
    tool: entry.name,
    input,
    references: collectReferences(input),
  };
}

function modelContentFor(text: string, calls: AgentFunctionCall[]): AgentHistoryContent | undefined {
  const parts: Array<Record<string, unknown>> = [];
  if (text.trim()) parts.push({ text: text.trim() });
  for (const call of calls) {
    parts.push({
      functionCall: {
        id: call.id,
        name: call.functionName ?? call.bridge,
        args: call.input,
      },
    });
  }
  return parts.length ? { role: 'model', parts } : undefined;
}

function prepareModel(rawPayload: AgentTurnRequest) {
  const payload = validatePayload(rawPayload);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');
  const entries = payload.allowedTools.map((name) => agentToolCatalogByName.get(name)!);
  const allowedFunctions = new Map(entries.map((entry) => [entry.functionName, entry]));
  const config: Record<string, unknown> = {
    systemInstruction: ATAL_AGENT_SYSTEM_PROMPT,
    maxOutputTokens: 2_048,
  };
  if (entries.length) {
    config.tools = [{ functionDeclarations: entries.map(toolDeclaration) }];
    config.toolConfig = { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } };
  }
  return {
    ai: new GoogleGenAI({ apiKey }),
    allowedFunctions,
    request: {
      model: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
      contents: [...payload.conversationHistory, initialUserContent(payload), ...payload.history] as never,
      config: config as never,
    },
  };
}

export async function analyzeAgentTurn(rawPayload: AgentTurnRequest): Promise<AgentModelTurn> {
  const prepared = prepareModel(rawPayload);
  const response = await prepared.ai.models.generateContent(prepared.request);
  const calls = (response.functionCalls ?? []).map((call) => modelCall(call as { id?: string; name?: string; args?: Record<string, unknown> }, prepared.allowedFunctions));
  const text = response.text?.trim() ?? '';
  const modelContent = response.candidates?.[0]?.content as AgentHistoryContent | undefined;
  return { text, calls, modelContent: modelContent ?? modelContentFor(text, calls) };
}

export async function streamAgentTurn(rawPayload: AgentTurnRequest, onTextDelta: (delta: string) => void): Promise<AgentModelTurn> {
  const prepared = prepareModel(rawPayload);
  const stream = await prepared.ai.models.generateContentStream(prepared.request);
  let text = '';
  const calls = new Map<string, AgentFunctionCall>();

  for await (const chunk of stream) {
    const delta = chunk.text ?? '';
    if (delta) {
      text += delta;
      onTextDelta(delta);
    }
    for (const rawCall of chunk.functionCalls ?? []) {
      const call = modelCall(rawCall as { id?: string; name?: string; args?: Record<string, unknown> }, prepared.allowedFunctions);
      const key = call.id || JSON.stringify({ tool: call.tool, input: call.input });
      calls.set(key, call);
    }
  }

  const values = [...calls.values()];
  return { text: text.trim(), calls: values, modelContent: modelContentFor(text, values) };
}

export async function atalAIAgentHandler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método no permitido.' });
  try {
    sendJson(response, 200, await analyzeAgentTurn(await readJson(request)));
  } catch (error) {
    const message = safeMessage(error);
    sendJson(response, /límite|demasiados/i.test(message) ? 413 : 503, { error: message });
  }
}

export async function atalAIAgentStreamHandler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método no permitido.' });
  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders?.();
  try {
    const turn = await streamAgentTurn(await readJson(request), (text) => writeNdjson(response, { type: 'text_delta', text }));
    writeNdjson(response, { type: 'done', turn });
  } catch (error) {
    writeNdjson(response, { type: 'error', error: safeMessage(error) });
  } finally {
    response.end();
  }
}
