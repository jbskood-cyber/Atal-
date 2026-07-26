import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const modelModule = () => loadCore('src/features/atal-ai/core/agentic/modelFallback.js');

test('AI Studio opaque runtime values are rejected as Gemini model names while valid fallback models remain available', () => {
  const { resolveGeminiModelCascade, DEFAULT_GEMINI_MODEL_CASCADE } = modelModule();
  const result = resolveGeminiModelCascade([
    'studio-runtime-resource-token',
    ...DEFAULT_GEMINI_MODEL_CASCADE,
  ].join(','));

  assert.deepEqual(result, [...DEFAULT_GEMINI_MODEL_CASCADE]);
});

test('an invalid configured model by itself falls back to the canonical Gemini cascade', () => {
  const { resolveGeminiModelCascade, DEFAULT_GEMINI_MODEL_CASCADE } = modelModule();
  const result = resolveGeminiModelCascade('studio-runtime-resource-token');

  assert.deepEqual(result, [...DEFAULT_GEMINI_MODEL_CASCADE]);
});

test('models/ prefix is normalized to the SDK-friendly Gemini model name', () => {
  const { resolveGeminiModelCascade } = modelModule();
  const result = resolveGeminiModelCascade('models/gemini-2.5-flash-lite');

  assert.deepEqual(result, ['gemini-2.5-flash-lite']);
});

test('a retired Gemini model is recoverable so the cascade can continue to a supported model', () => {
  const { isTransientGeminiFailure } = modelModule();
  const error = new Error('{"error":{"code":404,"message":"This model models/gemini-2.5-flash-lite is no longer available to new users. Please update your code to use a newer model for the latest features and improvements.","status":"NOT_FOUND"}}');

  assert.equal(isTransientGeminiFailure(error), true);
});
