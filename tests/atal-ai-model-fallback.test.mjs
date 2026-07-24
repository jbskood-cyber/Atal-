import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const fallbackModule = () => loadCore('src/features/atal-ai/core/agentic/modelFallback.js');

test('default Gemini cascade prefers capability before progressively cheaper fallbacks', () => {
  const { DEFAULT_GEMINI_MODEL_CASCADE } = fallbackModule();
  assert.deepEqual(DEFAULT_GEMINI_MODEL_CASCADE, [
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
  ]);
});

test('configured cascade is trimmed deduplicated and falls back to safe defaults', () => {
  const { resolveGeminiModelCascade } = fallbackModule();
  assert.deepEqual(
    resolveGeminiModelCascade(' gemini-3.6-flash,gemini-3.1-flash-lite,gemini-3.6-flash, '),
    ['gemini-3.6-flash', 'gemini-3.1-flash-lite'],
  );
  assert.deepEqual(resolveGeminiModelCascade(''), fallbackModule().DEFAULT_GEMINI_MODEL_CASCADE);
});

test('only transient provider or empty-model failures authorize another model', () => {
  const { isTransientGeminiFailure } = fallbackModule();
  for (const message of [
    '429 RESOURCE_EXHAUSTED quota exceeded',
    '503 UNAVAILABLE service overloaded',
    'The request timed out',
    'fetch failed ECONNRESET',
    'MODEL_EMPTY_RESPONSE',
  ]) assert.equal(isTransientGeminiFailure(new Error(message)), true, message);

  for (const message of [
    '401 invalid API key',
    '403 permission denied',
    'response schema invalid',
    'function call arguments invalid',
  ]) assert.equal(isTransientGeminiFailure(new Error(message)), false, message);
});

test('fallback runner preserves the request and advances through models with exponential waits', async () => {
  const { runWithGeminiFallback } = fallbackModule();
  const attempts = [];
  const waits = [];
  const request = { conversationId: 'conversation-1', text: 'Hola' };
  const result = await runWithGeminiFallback({
    models: ['primary', 'economy-a', 'economy-b'],
    operation: async (model) => {
      attempts.push({ model, request });
      if (model !== 'economy-b') throw new Error('429 RESOURCE_EXHAUSTED');
      return { model, answer: 'Listo' };
    },
    sleep: async (milliseconds) => { waits.push(milliseconds); },
  });

  assert.deepEqual(attempts.map((item) => item.model), ['primary', 'economy-a', 'economy-b']);
  assert.equal(attempts.every((item) => item.request === request), true);
  assert.deepEqual(waits, [250, 500]);
  assert.deepEqual(result, { model: 'economy-b', answer: 'Listo' });
});

test('fallback runner never masks permanent configuration failures', async () => {
  const { runWithGeminiFallback } = fallbackModule();
  const attempts = [];
  await assert.rejects(
    runWithGeminiFallback({
      models: ['primary', 'fallback'],
      operation: async (model) => {
        attempts.push(model);
        throw new Error('401 invalid API key');
      },
      sleep: async () => undefined,
    }),
    /401 invalid API key/,
  );
  assert.deepEqual(attempts, ['primary']);
});
