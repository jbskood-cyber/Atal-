import type { AIConversation, AtalAIDraft } from '../types';

export const AI_CONVERSATIONS_KEY = 'atal:ai-conversations:v1';
export const AI_DRAFTS_KEY = 'atal:ai-drafts:v1';

function readCollection<T>(key: string, guard: (value: unknown) => value is T): T[] {
  if (typeof window === 'undefined') return [];
  try { const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value.filter(guard) : []; } catch { return []; }
}

function isConversation(value: unknown): value is AIConversation { const item = value as Partial<AIConversation>; return Boolean(value && typeof value === 'object' && typeof item.id === 'string' && typeof item.draftId === 'string' && Array.isArray(item.messages)); }
function isDraft(value: unknown): value is AtalAIDraft { const item = value as Partial<AtalAIDraft>; return Boolean(value && typeof value === 'object' && typeof item.id === 'string' && item.patient && item.plan && Array.isArray(item.exercises)); }

export function readAIConversations() {
  return readCollection(AI_CONVERSATIONS_KEY, isConversation).map((conversation) => ({
    ...conversation,
    composerText: typeof conversation.composerText === 'string' ? conversation.composerText : '',
    transcription: typeof conversation.transcription === 'string' ? conversation.transcription : '',
    attachmentMetadata: Array.isArray(conversation.attachmentMetadata) ? conversation.attachmentMetadata : [],
    privateContact: conversation.privateContact ?? { phone: '', email: '', address: '', emergencyContact: '' },
  }));
}
export function readAIDrafts() {
  return readCollection(AI_DRAFTS_KEY, isDraft).map((draft) => ({
    ...draft,
    patient: { ...draft.patient, symptoms: Array.isArray(draft.patient.symptoms) ? draft.patient.symptoms : [] },
    exercises: draft.exercises.map((exercise) => ({ ...exercise, reusePreference: exercise.reusePreference === 'create-new' ? 'create-new' as const : 'reuse-exact' as const })),
  }));
}
export function getLatestAIConversation() { return readAIConversations().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null; }
export function getAIDraft(id: string) { return readAIDrafts().find((draft) => draft.id === id) ?? null; }
export function saveAIConversation(conversation: AIConversation) { const next = [...readAIConversations().filter((item) => item.id !== conversation.id), conversation]; window.localStorage.setItem(AI_CONVERSATIONS_KEY, JSON.stringify(next)); }
export function saveAIDraft(draft: AtalAIDraft) { const next = [...readAIDrafts().filter((item) => item.id !== draft.id), draft]; window.localStorage.setItem(AI_DRAFTS_KEY, JSON.stringify(next)); }
export function clearAIWorkspace(conversationId: string, draftId: string) { window.localStorage.setItem(AI_CONVERSATIONS_KEY, JSON.stringify(readAIConversations().filter((item) => item.id !== conversationId))); window.localStorage.setItem(AI_DRAFTS_KEY, JSON.stringify(readAIDrafts().filter((item) => item.id !== draftId))); }

export function createAIConversation(): AIConversation {
  const now = new Date().toISOString();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return { id: `conversation-${id}`, draftId: `draft-${id}`, createdAt: now, updatedAt: now, status: 'empty', composerText: '', transcription: '', messages: [], attachmentMetadata: [], privateContact: { phone: '', email: '', address: '', emergencyContact: '' } };
}
