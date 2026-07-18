import assert from 'node:assert/strict';
import test from 'node:test';
import type { AIExerciseDraft } from '../src/features/atal-ai/types.ts';
import { mergeExerciseDrafts } from '../src/features/atal-ai/data/exerciseDraftAdapter.ts';

const exercise = (id: string, sourceExerciseId?: string): AIExerciseDraft => ({ id, sourceExerciseId, name: 'Puente', region: 'Cadera', category: 'Fuerza', objective: '', startingPosition: '', instructions: [], precautions: [], equipment: '', difficulty: 'Inicial', sets: 3, repetitions: '10', duration: '', rest: '', maxPain: 3, tags: [], notes: '', reusePreference: 'reuse-exact' });

test('deduplicates library exercises by their persistent ID', () => {
  assert.equal(mergeExerciseDrafts([exercise('a', 'e01')], [exercise('b', 'e01')]).length, 1);
});

test('keeps distinct AI suggestions and library selections', () => {
  assert.equal(mergeExerciseDrafts([exercise('ai-a')], [exercise('library-b', 'e02')]).length, 2);
});
