import type { GuidedExercise, GuidedSessionDraft } from './types';

export const sessionStorageKey = (patientId: string, planId: string) => `atal:guided-session:v2:${patientId}:${planId}`;
const legacySessionStorageKey = (patientId: string) => `atal:guided-session:v1:${patientId}`;

export function createSessionDraft(patientId: string, planId: string, exercises: GuidedExercise[]): GuidedSessionDraft {
  return {
    version: 2, patientId, planId, status: 'in_progress', stage: 'prepare', currentExerciseIndex: 0,
    start: { pain: 0, energy: 5, comment: '' },
    exercises: Object.fromEntries(exercises.map((exercise) => [exercise.id, { sets: Array.from({ length: exercise.sets }, () => ({ completed: false, repetitions: exercise.repetitions, seconds: exercise.seconds })) }])),
    end: { pain: 0, energy: 5, effort: 3, symptoms: ['ninguno'], comment: '', easiest: '', hardest: '', discomfort: '' },
  };
}

export function readSessionDraft(patientId: string, planId: string): { draft: GuidedSessionDraft | null; error: boolean } {
  try {
    localStorage.removeItem(legacySessionStorageKey(patientId));
    const raw = localStorage.getItem(sessionStorageKey(patientId, planId));
    if (!raw) return { draft: null, error: false };
    const parsed = JSON.parse(raw) as GuidedSessionDraft;
    if (parsed.version !== 2 || parsed.patientId !== patientId || parsed.planId !== planId || !parsed.exercises) throw new Error('Invalid draft');
    return { draft: parsed, error: false };
  } catch { return { draft: null, error: true }; }
}

export function writeSessionDraft(draft: GuidedSessionDraft) { localStorage.setItem(sessionStorageKey(draft.patientId, draft.planId), JSON.stringify(draft)); }
export function clearSessionDraft(patientId: string, planId: string) { localStorage.removeItem(sessionStorageKey(patientId, planId)); }
