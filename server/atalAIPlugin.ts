import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { ATAL_AI_SYSTEM_PROMPT, ATAL_AI_TRANSCRIPTION_PROMPT } from '../src/features/atal-ai/api/prompts';
import { atalAIDraftJsonSchema } from '../src/features/atal-ai/api/schemas';
import type { AtalAIAnalyzeRequest } from '../src/features/atal-ai/types';

const MAX_BODY_BYTES = 32 * 1024 * 1024;

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
    if (size > MAX_BODY_BYTES) throw new Error('La solicitud supera el límite de 32 MB. Reduce el número o tamaño de los archivos.');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as AtalAIPayload;
}

function cleanDataUrl(data: string) {
  const comma = data.indexOf(',');
  return comma >= 0 ? data.slice(comma + 1) : data;
}

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/API key|GEMINI_API_KEY|403|401/i.test(message)) return 'Atal IA no está configurada todavía. Añade GEMINI_API_KEY como secreto del proyecto en Google AI Studio y vuelve a intentarlo.';
  if (/quota|429/i.test(message)) return 'Gemini alcanzó temporalmente su límite. Conservamos tu borrador; inténtalo de nuevo en unos minutos.';
  if (/JSON|schema|response/i.test(message)) return 'Gemini devolvió una respuesta que no pudimos validar. Tu entrada sigue intacta; vuelve a intentarlo o edítala.';
  return message || 'Gemini no pudo procesar la solicitud. Tu contenido no se perdió.';
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

  if (payload.mode === 'transcribe') {
    const audio = attachments.find((attachment) => attachment.kind === 'audio' && attachment.data);
    if (!audio) throw new Error('No encontramos un audio válido para transcribir.');
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: audio.type, data: cleanDataUrl(audio.data) } }, { text: ATAL_AI_TRANSCRIPTION_PROMPT }] }],
    });
    return { transcript: response.text?.trim() ?? '' };
  }

  const parts = [
    ...attachments.filter((attachment) => attachment.data).map((attachment) => ({ inlineData: { mimeType: attachment.type, data: cleanDataUrl(attachment.data) } })),
    { text: promptFor(payload) },
  ];
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash',
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
}

export function atalAIPlugin(): Plugin {
  const handler = async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método no permitido.' });
    try {
      sendJson(response, 200, await analyze(await readJson(request)));
    } catch (error) {
      sendJson(response, /límite|demasiado/i.test(safeMessage(error)) ? 413 : 503, { error: safeMessage(error) });
    }
  };
  return {
    name: 'atal-ai-secure-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/atal-ai/analyze', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/atal-ai/analyze', handler);
    },
  };
}
