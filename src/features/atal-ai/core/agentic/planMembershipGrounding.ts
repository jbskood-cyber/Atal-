import type { AgentFunctionCall, AgentStepResult } from './contracts';
import { groundReportReviewCall } from './reportReviewGrounding';

type RecordValue = Record<string, unknown>;
type ExerciseEvidence = { id: string; name: string };

function recordValue(value: unknown): RecordValue | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function looksLikeSingularExerciseRemoval(goal: string): boolean {
  const normalized = normalizeText(goal);
  const removal = /\b(quita(?:le)?|retira(?:le)?|elimina(?:le)?|saca(?:le)?|remove|remueve)\b/.test(normalized);
  if (!removal) return false;
  if (/\b(los|varios|ambos|dos|tres|ejercicios)\b/.test(normalized)) return false;
  return /\b(el|un)\s+ejercicio\b/.test(normalized) || /\bexercise\b/.test(normalized);
}

function exerciseEvidenceFromReads(completed: AgentStepResult[]): ExerciseEvidence[] {
  const evidence = new Map<string, ExerciseEvidence>();
  for (let index = completed.length - 1; index >= 0; index -= 1) {
    const step = completed[index];
    if (step.invocation.tool !== 'app.read' || step.result.status !== 'success') continue;
    const data = recordValue(step.result.data);
    const exercises = data?.exercises;
    if (!Array.isArray(exercises)) continue;
    for (const value of exercises) {
      const exercise = recordValue(value);
      const id = typeof exercise?.id === 'string' ? exercise.id.trim() : '';
      const name = typeof exercise?.name === 'string' ? exercise.name.trim() : '';
      if (id && name && !evidence.has(id)) evidence.set(id, { id, name });
    }
  }
  return [...evidence.values()];
}

function groundedExerciseForGoal(goal: string, completed: AgentStepResult[]): string | undefined {
  const evidence = exerciseEvidenceFromReads(completed);
  if (!evidence.length) return undefined;

  const normalizedGoal = ` ${normalizeText(goal)} `;
  const explicitMatches = evidence.filter(({ name }) => {
    const normalizedName = normalizeText(name);
    return normalizedName.length > 0 && normalizedGoal.includes(` ${normalizedName} `);
  });
  if (explicitMatches.length === 1) return explicitMatches[0].id;

  return evidence.length === 1 ? evidence[0].id : undefined;
}

export function groundPlanMembershipCall(
  goal: string,
  completed: AgentStepResult[],
  call: AgentFunctionCall,
): AgentFunctionCall {
  const groundedCall = groundReportReviewCall(completed, call);
  if (groundedCall.tool !== 'plan.membership' || !looksLikeSingularExerciseRemoval(goal)) return groundedCall;
  const input = recordValue(groundedCall.input);
  if (!input || input.operation !== 'remove') return groundedCall;
  const exerciseIds = stringArray(input.exerciseIds);
  if (!exerciseIds?.length) return groundedCall;

  const groundedExerciseId = groundedExerciseForGoal(goal, completed);
  if (!groundedExerciseId || (exerciseIds.length === 1 && exerciseIds[0] === groundedExerciseId)) return groundedCall;

  return {
    ...groundedCall,
    input: {
      ...input,
      exerciseIds: [groundedExerciseId],
    },
  };
}
