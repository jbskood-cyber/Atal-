import { getAtalState } from '@/src/data/atalStore';
import { assertAIRequestSize } from '../domain/attachmentLimits';
import { normalizeAtalAIDraft } from './schemas';
import type { AgentModelTurn, AgentTurnRequest } from '../core/agentic/contracts';
import type { AtalAIAnalyzeRequest, AtalAIAnalyzeResponse } from '../types';

type AtalAIPreferences = {
  suggestions: boolean;
  alerts: boolean;
  instructions: string;
};

type AgentStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'done'; turn: AgentModelTurn }
  | { type: 'error'; error: string };

export async function requestAtalAI(payload: AtalAIAnalyzeRequest, signal?: AbortSignal): Promise<AtalAIAnalyzeResponse> {
  const settings = getAtalState().settings;
  const preferences: AtalAIPreferences = {
    suggestions: settings.aiSuggestions,
    alerts: settings.aiAlerts,
    instructions: settings.aiInstructions.trim(),
  };
  const requestPayload = { ...payload, preferences };
  assertAIRequestSize(requestPayload);
  const response = await fetch('/api/atal-ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload),
    signal,
  });
  const result = await response.json().catch(() => ({})) as { draft?: unknown; transcript?: unknown; error?: unknown };
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Atal IA no pudo procesar la solicitud.');
  if (payload.mode === 'transcribe') return { transcript: typeof result.transcript === 'string' ? result.transcript : '' };
  const draft = normalizeAtalAIDraft(result.draft, payload.currentDraft?.id ?? payload.draftId);
  if (payload.currentDraft) {
    draft.createdAt = payload.currentDraft.createdAt;
    draft.baseVersions = payload.currentDraft.baseVersions;
  }
  if (payload.workContext) {
    draft.intent = payload.workContext.intent;
    draft.selectedPatientId = payload.workContext.selectedPatientId;
    draft.selectedPlanId = payload.workContext.selectedPlanId;
    draft.selectedExerciseId = payload.workContext.selectedExerciseId;
    if (draft.command) {
      draft.command = {
        ...draft.command,
        patientId: draft.command.patientId || payload.workContext.selectedPatientId,
        planId: draft.command.planId || payload.workContext.selectedPlanId,
        exerciseId: draft.command.exerciseId || payload.workContext.selectedExerciseId,
      };
    }
  }
  return { draft };
}

async function requestJsonAgentTurn(payload: AgentTurnRequest, signal?: AbortSignal): Promise<AgentModelTurn> {
  const response = await fetch('/api/atal-ai/agent-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const result = await response.json().catch(() => ({})) as Partial<AgentModelTurn> & { error?: unknown };
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Atal IA no pudo continuar la tarea.');
  return {
    text: typeof result.text === 'string' ? result.text : '',
    calls: Array.isArray(result.calls) ? result.calls : [],
    modelContent: result.modelContent,
    interactionId: typeof result.interactionId === 'string' ? result.interactionId : undefined,
  };
}

async function requestStreamingAgentTurn(
  payload: AgentTurnRequest,
  signal: AbortSignal | undefined,
  onTextDelta: (delta: string) => void,
): Promise<AgentModelTurn> {
  const response = await fetch('/api/atal-ai/agent-turn-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok || !response.body) {
    const result = await response.json().catch(() => ({})) as { error?: unknown };
    throw new Error(typeof result.error === 'string' ? result.error : 'Atal IA no pudo iniciar la respuesta progresiva.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalTurn: AgentModelTurn | null = null;

  const consumeLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as AgentStreamEvent;
    if (event.type === 'text_delta') onTextDelta(event.text);
    else if (event.type === 'done') finalTurn = event.turn;
    else throw new Error(event.error);
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) consumeLine(line);
    if (done) break;
  }
  if (buffer.trim()) consumeLine(buffer);
  if (!finalTurn) throw new Error('Atal IA terminó la transmisión sin una respuesta válida.');
  return finalTurn;
}

export async function requestAtalAgentTurn(
  payload: AgentTurnRequest,
  signal?: AbortSignal,
  onTextDelta?: (delta: string) => void,
): Promise<AgentModelTurn> {
  assertAIRequestSize(payload);
  if (!onTextDelta) return requestJsonAgentTurn(payload, signal);
  try {
    return await requestStreamingAgentTurn(payload, signal, onTextDelta);
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
    return requestJsonAgentTurn(payload, signal);
  }
}
