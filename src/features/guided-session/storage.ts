import type { GuidedExercise, GuidedSessionDraft } from './types';

export const sessionStorageKey = (patientId: string) => `atal:guided-session:v1:${patientId}`;

export function createSessionDraft(patientId: string, exercises: GuidedExercise[]): GuidedSessionDraft {
  return {
    version: 1, patientId, status: 'in_progress', stage: 'prepare', currentExerciseIndex: 0,
    start: { pain: 0, energy: 5, comment: '' },
    exercises: Object.fromEntries(exercises.map((exercise) => [exercise.id, { sets: Array.from({ length: exercise.sets }, () => ({ completed: false, repetitions: exercise.repetitions, seconds: exercise.seconds })) }])),
    end: { pain: 0, energy: 5, effort: 3, symptoms: ['ninguno'], comment: '', easiest: '', hardest: '', discomfort: '' },
  };
}

export function readSessionDraft(patientId: string): { draft: GuidedSessionDraft | null; error: boolean } {
  try {
    const raw = localStorage.getItem(sessionStorageKey(patientId));
    if (!raw) return { draft: null, error: false };
    const parsed = JSON.parse(raw) as GuidedSessionDraft;
    if (parsed.version !== 1 || parsed.patientId !== patientId || !parsed.exercises) throw new Error('Invalid draft');
    return { draft: parsed, error: false };
  } catch { return { draft: null, error: true }; }
}

export function writeSessionDraft(draft: GuidedSessionDraft) { localStorage.setItem(sessionStorageKey(draft.patientId), JSON.stringify(draft)); }
export function clearSessionDraft(patientId: string) { localStorage.removeItem(sessionStorageKey(patientId)); }
