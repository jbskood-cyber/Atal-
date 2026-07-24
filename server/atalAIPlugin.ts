import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { ATAL_AI_SYSTEM_PROMPT, ATAL_AI_TRANSCRIPTION_PROMPT } from '../src/features/atal-ai/api/prompts';
import { atalAIDraftJsonSchema } from '../src/features/atal-ai/api/schemas';
import {
  DEFAULT_GEMINI_MODEL_CASCADE,
  resolveGeminiModelCascade,
  runWithGeminiFallback,
} from '../src/features/atal-ai/core/agentic/modelFallback';
import { MAX_AI_REQUEST_BODY_BYTES } from '../src/features/atal-ai/domain/attachmentLimits';
import type { AtalAIAnalyzeRequest } from '../src/features/atal-ai/types';
import { atalAIAgentHandler, atalAIAgentStreamHandler } from './atalAIAgent';

type AtalAIPayload = AtalAIAnalyzeRequest & {
  preferences?: {
    suggestions?: boolean;
    alerts?: boolean;
    instructions?: string;
  };
};

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_AI_REQUEST_BODY_BYTES) throw new Error('La solicitud supera el límite seguro de envío. Reduce el número o tamaño de los archivos.');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as AtalAIPayload;
}

function cleanDataUrl(data: string) {
  const comma = data.indexOf(',');
  return comma >= 0 ? data.slice(comma + 1) : data;
}

function rawMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? '');
}

function safeMessage(error: unknown) {
  const message = rawMessage(error);
  if (/API key|GEMINI_API_KEY|403|401/i.test(message)) return 'Atal IA no está configurada todavía. Añade GEMINI_API_KEY como secreto del proyecto en Google AI Studio y vuelve a intentarlo.';
  if (/quota|429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|overload|timed? out|timeout|fetch failed|network/i.test(message)) {
    return 'Atal IA está temporalmente ocupada. Conservamos tu borrador; vuelve a intentarlo en unos segundos.';
  }
  if (/JSON|schema|response/i.test(message)) return 'Gemini devolvió una respuesta que no pudimos validar. Tu entrada sigue intacta; vuelve a intentarlo o edítala.';
  return message || 'Gemini no pudo procesar la solicitud. Tu contenido no se perdió.';
}

function errorStatus(error: unknown): number {
  return /supera el límite seguro|demasiados archivos/i.test(rawMessage(error)) ? 413 : 503;
}

function configuredModels(): string[] {
  const explicitCascade = process.env.GEMINI_MODEL_CASCADE?.trim();
  if (explicitCascade) return resolveGeminiModelCascade(explicitCascade);
  const preferred = process.env.GEMINI_MODEL?.trim();
  return resolveGeminiModelCascade([preferred, ...DEFAULT_GEMINI_MODEL_CASCADE].filter(Boolean).join(','));
}

function promptFor(payload: AtalAIPayload) {
  const previous = payload.currentDraft ? `\nBorrador actual que debes actualizar sin perder datos confirmados:\n${JSON.stringify(payload.currentDraft)}` : '';
  const instruction = payload.mode === 'regenerate-plan'
    ? 'Regenera solamente el plan; conserva paciente y ejercicios, salvo ajustes necesarios para mantener coherencia.'
    : payload.mode === 'regenerate-exercise'
      ? `Regenera solamente el ejercicio con id ${payload.targetExerciseId ?? 'indicado'}; conserva paciente, plan y los demás ejercicios.`
      : 'Extrae o completa un único borrador de paciente, expediente, plan y ejercicios.';
  const context = payload.workContext ? `\nContexto elegido por el fisioterapeuta (vinculante):\n${JSON.stringify(payload.workContext)}` : '';
  const existing = payload.existingContext ? `\nDatos clínicos locales estrictamente necesarios que debes conservar salvo cambio explícito:\n${JSON.stringify(payload.existingContext)}` : '';
  const preferences = payload.preferences;
  const preferenceContext = preferences ? `\nPreferencias profesionales para esta respuesta:\n- Sugerencias clínicas opcionales: ${preferences.suggestions === false ? 'desactivadas; limita la respuesta a lo solicitado' : 'activadas cuando aporten valor'}\n- Alertas inteligentes: ${preferences.alerts === false ? 'desactivadas, salvo riesgos clínicos o de seguridad que nunca deben omitirse' : 'activadas cuando exista algo concreto que revisar'}\n- Instrucciones del fisioterapeuta: ${preferences.instructions?.trim() || 'sin indicaciones adicionales'}\n` : '';
  return `${instruction}${context}${existing}${preferenceContext}\nTexto del fisioterapeuta:\n${payload.text || '(sin texto adicional)'}\n\nTranscripción revisada:\n${payload.transcription || '(sin transcripción)'}${previous}`;
}

async function analyze(payload: AtalAIPayload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');
  const ai = new GoogleGenAI({ apiKey });
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  const models = configuredModels();

  if (payload.mode === 'transcribe') {
    const audio = attachments.find((attachment) => attachment.kind === 'audio' && attachment.data);
    if (!audio) throw new Error('No encontramos un audio válido para transcribir.');
    return runWithGeminiFallback({
      models,
      operation: async (model) => {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: audio.type, data: cleanDataUrl(audio.data) } }, { text: ATAL_AI_TRANSCRIPTION_PROMPT }] }],
        });
        return { transcript: response.text?.trim() ?? '' };
      },
    });
  }

  const parts = [
    ...attachments.filter((attachment) => attachment.data).map((attachment) => ({ inlineData: { mimeType: attachment.type, data: cleanDataUrl(attachment.data) } })),
    { text: promptFor(payload) },
  ];
  return runWithGeminiFallback({
    models,
    operation: async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: ATAL_AI_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: atalAIDraftJsonSchema,
        },
      });
      const text = response.text;
      if (!text) throw new Error('Gemini devolvió una respuesta vacía.');
      return { draft: JSON.parse(text) as unknown };
    },
  });
}

export function atalAIPlugin(): Plugin {
  const legacyHandler = async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método no permitido.' });
    try {
      sendJson(response, 200, await analyze(await readJson(request)));
    } catch (error) {
      sendJson(response, errorStatus(error), { error: safeMessage(error) });
    }
  };
  return {
    name: 'atal-ai-secure-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/atal-ai/analyze', legacyHandler);
      server.middlewares.use('/api/atal-ai/agent-turn-stream', atalAIAgentStreamHandler);
      server.middlewares.use('/api/atal-ai/agent-turn', atalAIAgentHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/atal-ai/analyze', legacyHandler);
      server.middlewares.use('/api/atal-ai/agent-turn-stream', atalAIAgentStreamHandler);
      server.middlewares.use('/api/atal-ai/agent-turn', atalAIAgentHandler);
    },
  };
}
