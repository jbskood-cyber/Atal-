import type { AIConversation, AtalAIDraft } from '../types';

export const AI_CONVERSATIONS_KEY = 'atal:ai-conversations:v1';
export const AI_DRAFTS_KEY = 'atal:ai-drafts:v1';

function readCollection<T>(key: string, guard: (value: unknown) => value is T): T[] {
  if (typeof window === 'undefined') return [];
  try { const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value.filter(guard) : []; } catch { return []; }
}

function isConversation(value: unknown): value is AIConversation { const item = value as Partial<AIConversation>; return Boolean(value && typeof value === 'object' && typeof item.id === 'string' && typeof item.draftId === 'string' && Array.isArray(item.messages)); }
function isDraft(value: unknown): value is AtalAIDraft { const item = value as Partial<AtalAIDraft>; return Boolean(value && typeof value === 'object' && typeof item.id === 'string' && item.patient && item.plan && Array.isArray(item.exercises)); }

export function readAIConversations(): AIConversation[] {
  return readCollection(AI_CONVERSATIONS_KEY, isConversation).map((conversation): AIConversation => ({
    ...conversation,
    composerText: typeof conversation.composerText === 'string' ? conversation.composerText : '',
    transcription: typeof conversation.transcription === 'string' ? conversation.transcription : '',
    attachmentMetadata: Array.isArray(conversation.attachmentMetadata) ? conversation.attachmentMetadata : [],
    privateContact: conversation.privateContact ?? { phone: '', email: '', address: '', emergencyContact: '' },
    workContext: conversation.workContext ? { ...conversation.workContext, selectedExerciseId: conversation.workContext.selectedExerciseId ?? '' } : { intent:'create_patient_plan' as const,patientMode:'new' as const,selectedPatientId:'',selectedPlanId:'',selectedExerciseId:'' },
  }));
}
export function readAIDrafts(): AtalAIDraft[] {
  return readCollection(AI_DRAFTS_KEY, isDraft).map((draft): AtalAIDraft => ({
    ...draft,
    patient: { ...draft.patient, symptoms: Array.isArray(draft.patient.symptoms) ? draft.patient.symptoms : [] },
    intent:['create_patient_plan','create_plan_for_existing_patient','create_exercise','update_patient_record','update_existing_plan','update_existing_exercise','search_patient','summarize_patient','add_patient_note','update_plan_status','archive_plan','restore_plan','replace_active_plan','summarize_sessions','create_report','export_data','update_settings'].includes(draft.intent)?draft.intent:'create_patient_plan',
    selectedPatientId:typeof draft.selectedPatientId==='string'?draft.selectedPatientId:'',selectedPlanId:typeof draft.selectedPlanId==='string'?draft.selectedPlanId:'',selectedExerciseId:typeof draft.selectedExerciseId==='string'?draft.selectedExerciseId:'',proposedActions:Array.isArray(draft.proposedActions)?draft.proposedActions:[],
    responseMode: draft.responseMode === 'query' || draft.responseMode === 'command' ? draft.responseMode : 'draft' as const,
    assistantMessage: typeof draft.assistantMessage === 'string' ? draft.assistantMessage : '',
    command: draft.command ?? null,
    baseVersions: draft.baseVersions ?? { patientUpdatedAt:'',recordUpdatedAt:'',planUpdatedAt:'' },
    plan: { ...draft.plan, progressCriteria: draft.plan.progressCriteria ?? '' },
    exercises: draft.exercises.map((exercise) => ({ ...exercise, reusePreference: exercise.reusePreference === 'create-new' ? 'create-new' as const : 'reuse-exact' as const })),
  }));
}
export function getLatestAIConversation() { return readAIConversations().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null; }
export function getAIDraft(id: string) { return readAIDrafts().find((draft) => draft.id === id) ?? null; }

function contextualDraftMatches(conversation: AIConversation, draft: AtalAIDraft) {
  if (!conversation.contextKey || !conversation.contextSurface) return false;
  if (conversation.contextSurface === 'plan') return Boolean(conversation.workContext.selectedPlanId) && draft.selectedPlanId === conversation.workContext.selectedPlanId;
  if (conversation.contextSurface === 'exercise') return Boolean(conversation.workContext.selectedExerciseId) && draft.selectedExerciseId === conversation.workContext.selectedExerciseId;
  return Boolean(conversation.workContext.selectedPatientId) && draft.selectedPatientId === conversation.workContext.selectedPatientId;
}

function normalizeContextualDraftLink(conversation: AIConversation): AIConversation {
  if (!conversation.contextKey || getAIDraft(conversation.draftId)) return conversation;
  const recovered = readAIDrafts()
    .filter((draft) => contextualDraftMatches(conversation, draft))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return recovered ? { ...conversation, draftId: recovered.id } : conversation;
}

export function saveAIConversation(conversation: AIConversation) {
  const normalized = normalizeContextualDraftLink(conversation);
  const next = [...readAIConversations().filter((item) => item.id !== normalized.id), normalized];
  window.localStorage.setItem(AI_CONVERSATIONS_KEY, JSON.stringify(next));
}
export function saveAIDraft(draft: AtalAIDraft) { const next = [...readAIDrafts().filter((item) => item.id !== draft.id), draft]; window.localStorage.setItem(AI_DRAFTS_KEY, JSON.stringify(next)); }
export function clearAIWorkspace(conversationId: string, draftId: string) { window.localStorage.setItem(AI_CONVERSATIONS_KEY, JSON.stringify(readAIConversations().filter((item) => item.id !== conversationId))); window.localStorage.setItem(AI_DRAFTS_KEY, JSON.stringify(readAIDrafts().filter((item) => item.id !== draftId))); }

export function createAIConversation(): AIConversation {
  const now = new Date().toISOString();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return { id: `conversation-${id}`, draftId: `draft-${id}`, createdAt: now, updatedAt: now, status: 'empty', composerText: '', transcription: '', messages: [], attachmentMetadata: [], privateContact: { phone: '', email: '', address: '', emergencyContact: '' },workContext:{intent:'create_patient_plan',patientMode:'new',selectedPatientId:'',selectedPlanId:'',selectedExerciseId:''} };
}
