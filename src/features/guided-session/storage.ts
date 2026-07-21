import type { GuidedExercise, GuidedPlan, GuidedSessionDraft } from './types';

export const sessionStorageKey = (patientId: string, planId: string) => `atal:guided-session:v2:${patientId}:${planId}`;
const sessionStoragePrefix = (patientId: string) => `atal:guided-session:v2:${patientId}:`;
const legacySessionStorageKey = (patientId: string) => `atal:guided-session:v1:${patientId}`;

function exerciseRecords(exercises: GuidedExercise[]) {
  return Object.fromEntries(exercises.map((exercise) => [exercise.id, {
    sets: Array.from({ length: exercise.sets }, () => ({ completed: false, repetitions: exercise.repetitions, seconds: exercise.seconds })),
  }]));
}

export function createSessionDraft(patientId: string, plan: GuidedPlan): GuidedSessionDraft {
  return {
    version: 2,
    patientId,
    planId: plan.id,
    planSnapshot: structuredClone(plan),
    status: 'in_progress',
    stage: 'prepare',
    currentExerciseIndex: 0,
    start: { pain: 0, energy: 5, comment: '' },
    exercises: exerciseRecords(plan.exercises),
    end: { pain: 0, energy: 5, effort: 3, symptoms: ['ninguno'], comment: '', easiest: '', hardest: '', discomfort: '' },
  };
}

function parseDraft(raw: string | null, patientId: string) {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as GuidedSessionDraft;
  if (parsed.version !== 2 || parsed.patientId !== patientId || !parsed.planId || !parsed.exercises) throw new Error('Invalid draft');
  return parsed;
}

function candidateKeys(patientId: string, preferredPlanId: string) {
  const preferred = sessionStorageKey(patientId, preferredPlanId);
  const prefix = sessionStoragePrefix(patientId);
  const keys = [preferred];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix) && key !== preferred) keys.push(key);
  }
  return keys;
}

export function readSessionDraft(patientId: string, currentPlan: GuidedPlan): { draft: GuidedSessionDraft | null; error: boolean } {
  try {
    localStorage.removeItem(legacySessionStorageKey(patientId));
    const drafts = candidateKeys(patientId, currentPlan.id)
      .map((key) => parseDraft(localStorage.getItem(key), patientId))
      .filter((draft): draft is GuidedSessionDraft => Boolean(draft))
      .sort((a, b) => (b.startedAt ?? b.completedAt ?? '').localeCompare(a.startedAt ?? a.completedAt ?? ''));
    const draft = drafts[0] ?? null;
    if (!draft) return { draft: null, error: false };
    if (!draft.planSnapshot) {
      draft.planSnapshot = structuredClone(currentPlan);
      writeSessionDraft(draft);
    }
    return { draft, error: false };
  } catch {
    return { draft: null, error: true };
  }
}

export function writeSessionDraft(draft: GuidedSessionDraft) {
  localStorage.setItem(sessionStorageKey(draft.patientId, draft.planId), JSON.stringify(draft));
}

export function clearSessionDraft(patientId: string, planId: string) {
  localStorage.removeItem(sessionStorageKey(patientId, planId));
}
