import { normalizeAtalAIDraft } from './schemas';
import type { AtalAIAnalyzeRequest, AtalAIAnalyzeResponse } from '../types';

export async function requestAtalAI(payload: AtalAIAnalyzeRequest, signal?: AbortSignal): Promise<AtalAIAnalyzeResponse> {
  const response = await fetch('/api/atal-ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
  const result = await response.json().catch(() => ({})) as { draft?: unknown; transcript?: unknown; error?: unknown };
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Atal IA no pudo procesar la solicitud.');
  if (payload.mode === 'transcribe') return { transcript: typeof result.transcript === 'string' ? result.transcript : '' };
  const draft=normalizeAtalAIDraft(result.draft, payload.currentDraft?.id ?? payload.draftId);
  if(payload.currentDraft){draft.createdAt=payload.currentDraft.createdAt;draft.baseVersions=payload.currentDraft.baseVersions;}
  if(payload.workContext){
    draft.intent=payload.workContext.intent;
    draft.selectedPatientId=payload.workContext.selectedPatientId;
    draft.selectedPlanId=payload.workContext.selectedPlanId;
    draft.selectedExerciseId=payload.workContext.selectedExerciseId;
    if(draft.command) draft.command={...draft.command,patientId:draft.command.patientId||payload.workContext.selectedPatientId,planId:draft.command.planId||payload.workContext.selectedPlanId,exerciseId:draft.command.exerciseId||payload.workContext.selectedExerciseId};
  }
  return { draft };
}
