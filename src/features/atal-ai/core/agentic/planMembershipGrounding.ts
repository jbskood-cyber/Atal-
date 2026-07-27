import type { AgentFunctionCall, AgentStepResult } from './contracts';

type RecordValue = Record<string, unknown>;

function recordValue(value: unknown): RecordValue | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

function looksLikeSingularExerciseRemoval(goal: string): boolean {
  const normalized = goal
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX');
  const removal = /\b(quita(?:le)?|retira(?:le)?|elimina(?:le)?|saca(?:le)?|remove|remueve)\b/.test(normalized);
  if (!removal) return false;
  if (/\b(los|varios|ambos|dos|tres|ejercicios)\b/.test(normalized)) return false;
  return /\b(el|un)\s+ejercicio\b/.test(normalized) || /\bexercise\b/.test(normalized);
}

function latestSingleExerciseRead(completed: AgentStepResult[]): string | undefined {
  for (let index = completed.length - 1; index >= 0; index -= 1) {
    const step = completed[index];
    if (step.invocation.tool !== 'app.read' || step.result.status !== 'success') continue;
    const data = recordValue(step.result.data);
    const exercises = data?.exercises;
    if (!Array.isArray(exercises) || exercises.length !== 1) continue;
    const exercise = recordValue(exercises[0]);
    const id = typeof exercise?.id === 'string' ? exercise.id.trim() : '';
    if (id) return id;
  }
  return undefined;
}

export function groundPlanMembershipCall(
  goal: string,
  completed: AgentStepResult[],
  call: AgentFunctionCall,
): AgentFunctionCall {
  if (call.tool !== 'plan.membership' || !looksLikeSingularExerciseRemoval(goal)) return call;
  const input = recordValue(call.input);
  if (!input || input.operation !== 'remove') return call;
  const exerciseIds = stringArray(input.exerciseIds);
  if (!exerciseIds?.length) return call;

  const groundedExerciseId = latestSingleExerciseRead(completed);
  if (!groundedExerciseId || (exerciseIds.length === 1 && exerciseIds[0] === groundedExerciseId)) return call;

  return {
    ...call,
    input: {
      ...input,
      exerciseIds: [groundedExerciseId],
    },
  };
}
