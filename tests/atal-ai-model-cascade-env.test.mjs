import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const modelFallback = () => loadCore('src/features/atal-ai/core/agentic/modelFallback.js');

test('ignores an opaque AI Studio GEMINI_MODEL value and keeps the valid Gemini cascade', () => {
  const { DEFAULT_GEMINI_MODEL_CASCADE, resolveGeminiModelCascade } = modelFallback();
  const configured = ['AQ.synthetic-platform-resource-token', ...DEFAULT_GEMINI_MODEL_CASCADE].join(',');

  assert.deepEqual(resolveGeminiModelCascade(configured), [...DEFAULT_GEMINI_MODEL_CASCADE]);
});

test('falls back to the default cascade when every configured model name is invalid', () => {
  const { DEFAULT_GEMINI_MODEL_CASCADE, resolveGeminiModelCascade } = modelFallback();

  assert.deepEqual(
    resolveGeminiModelCascade('AQ.synthetic-platform-resource-token,not-a-gemini-model'),
    [...DEFAULT_GEMINI_MODEL_CASCADE],
  );
});

test('preserves valid explicit Gemini model names and deduplicates them', () => {
  const { resolveGeminiModelCascade } = modelFallback();

  assert.deepEqual(
    resolveGeminiModelCascade('gemini-2.5-flash-lite, gemini-2.5-flash-lite, gemini-3.5-flash-lite'),
    ['gemini-2.5-flash-lite', 'gemini-3.5-flash-lite'],
  );
});
