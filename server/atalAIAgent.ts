import type { IncomingMessage, ServerResponse } from 'node:http';
import { FunctionCallingConfigMode, GoogleGenAI } from '@google/genai';
import { ATAL_AGENT_SYSTEM_PROMPT } from '../src/features/atal-ai/api/agentPrompt';
import { agentToolCatalogByName, type AgentToolCatalogEntry } from '../src/features/atal-ai/api/agentToolCatalog';
import type { AgentFunctionCall, AgentHistoryContent, AgentModelTurn, AgentTurnRequest } from '../src/features/atal-ai/core/agentic/contracts';
import { AGENT_MAX_ACTIVE_TOOLS } from '../src/features/atal-ai/core/agentic/toolSelection';
import { MAX_AI_REQUEST_BODY_BYTES } from '../src/features/atal-ai/domain/attachmentLimits';

const MAX_HISTORY_CONTENTS = 32;
const MAX_CONVERSATION_CONTENTS = 24;

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

function bridgeDescription(kind: AgentToolCatalogEntry['kind'], entries: AgentToolCatalogEntry[]): string {
  const contracts = entries.map((entry) => `- ${entry.name}: ${entry.contract}`).join('\n');
  return `${kind === 'read' ? 'Consulta' : 'Ejecuta'} una herramienta determinista de Atal. Herramientas disponibles en este turno:\n${contracts}`;
}

function bridgeDeclaration(kind: AgentToolCatalogEntry['kind'], entries: AgentToolCatalogEntry[]) {
  const name = kind === 'read' ? 'atal_read' : 'atal_action';
  return {
    name,
    description: bridgeDescription(kind, entries),
    parametersJsonSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', enum: entries.map((entry) => entry.name), description: 'Nombre exacto de la herramienta Atal.' },
        input: { type: 'object', description: 'Argumentos exactos descritos en el contrato de la herramienta.', additionalProperties: true },
        references: {
          type: 'array',
          description: 'Referencias de entidades necesarias. Usa IDs cuando estén disponibles.',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['patient', 'plan', 'exercise', 'session', 'clinical-record', 'settings'] },
              id: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['type'],
          },
        },
      },
      required: ['tool', 'input', 'references'],
    },
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

function modelCall(call: { id?: string; name?: string; args?: Record<string, unknown> }, entries: Map<string, AgentToolCatalogEntry>): AgentFunctionCall {
  const bridge = call.name === 'atal_read' ? 'atal_read' : call.name === 'atal_action' ? 'atal_action' : undefined;
  if (!bridge) throw new Error('Gemini solicitó una función desconocida.');
  const args = call.args && typeof call.args === 'object' ? call.args : {};
  const tool = typeof args.tool === 'string' ? args.tool : '';
  const entry = entries.get(tool);
  if (!entry) throw new Error(`Gemini solicitó una herramienta no permitida: ${tool}`);
  if ((bridge === 'atal_read' ? 'read' : 'action') !== entry.kind) throw new Error('Gemini usó el puente incorrecto para la herramienta.');
  return {
    id: call.id || `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bridge,
    tool,
    input: args.input && typeof args.input === 'object' ? args.input : {},
    references: Array.isArray(args.references) ? args.references as AgentFunctionCall['references'] : [],
  };
}

function modelContentFor(text: string, calls: AgentFunctionCall[]): AgentHistoryContent | undefined {
  const parts: Array<Record<string, unknown>> = [];
  if (text.trim()) parts.push({ text: text.trim() });
  for (const call of calls) {
    parts.push({
      functionCall: {
        id: call.id,
        name: call.bridge,
        args: { tool: call.tool, input: call.input, references: call.references },
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
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const readEntries = entries.filter((entry) => entry.kind === 'read');
  const actionEntries = entries.filter((entry) => entry.kind === 'action');
  const declarations = [
    ...(readEntries.length ? [bridgeDeclaration('read', readEntries)] : []),
    ...(actionEntries.length ? [bridgeDeclaration('action', actionEntries)] : []),
  ];
  const config: Record<string, unknown> = {
    systemInstruction: ATAL_AGENT_SYSTEM_PROMPT,
    maxOutputTokens: 2_048,
  };
  if (declarations.length) {
    config.tools = [{ functionDeclarations: declarations }];
    config.toolConfig = { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } };
  }
  return {
    ai: new GoogleGenAI({ apiKey }),
    byName,
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
  const calls = (response.functionCalls ?? []).map((call) => modelCall(call as { id?: string; name?: string; args?: Record<string, unknown> }, prepared.byName));
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
      const call = modelCall(rawCall as { id?: string; name?: string; args?: Record<string, unknown> }, prepared.byName);
      const key = call.id || JSON.stringify({ bridge: call.bridge, tool: call.tool, input: call.input, references: call.references });
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
