import { normalizeAtalAIDraft } from './schemas';
import type { AtalAIAnalyzeRequest, AtalAIAnalyzeResponse } from '../types';

export async function requestAtalAI(payload: AtalAIAnalyzeRequest): Promise<AtalAIAnalyzeResponse> {
  const response = await fetch('/api/atal-ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({})) as { draft?: unknown; transcript?: unknown; error?: unknown };
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Atal IA no pudo procesar la solicitud.');
  if (payload.mode === 'transcribe') return { transcript: typeof result.transcript === 'string' ? result.transcript : '' };
  return { draft: normalizeAtalAIDraft(result.draft, payload.currentDraft?.id) };
}
