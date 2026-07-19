import type { ExerciseEntity } from '@/src/data/atalStore';
import type { AIExerciseDraft } from '../types';

export function exerciseEntityToDraft(exercise: ExerciseEntity): AIExerciseDraft {
  return {
    id: `library-${exercise.id}`,
    sourceExerciseId: exercise.id,
    name: exercise.name,
    region: exercise.region,
    category: exercise.category,
    objective: exercise.objective,
    startingPosition: exercise.startingPosition,
    instructions: exercise.instructions,
    precautions: exercise.precautions ? exercise.precautions.split('\n').filter(Boolean) : [],
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    sets: exercise.sets,
    repetitions: exercise.repetitions ? String(exercise.repetitions) : '',
    duration: exercise.time ?? '',
    rest: exercise.rest,
    maxPain: exercise.maxPain,
    tags: exercise.tags,
    notes: exercise.notes,
    reusePreference: 'reuse-exact',
  };
}

export function mergeExerciseDrafts(current: AIExerciseDraft[], additions: AIExerciseDraft[]) {
  const keys = new Set(current.map(exerciseKey));
  return additions.reduce<AIExerciseDraft[]>((result, exercise) => {
    const key = exerciseKey(exercise);
    if (!keys.has(key)) { keys.add(key); result.push(exercise); }
    return result;
  }, [...current]);
}

function exerciseKey(exercise: AIExerciseDraft) {
  return exercise.sourceExerciseId || `${exercise.name.trim().toLocaleLowerCase('es-MX')}|${exercise.region.trim().toLocaleLowerCase('es-MX')}`;
}
