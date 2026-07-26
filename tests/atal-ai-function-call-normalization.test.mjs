import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const fallback = () => loadCore('src/features/atal-ai/core/agentic/modelFallback.js');

test('an undeclared Gemini tool name is retryable across the configured model cascade', () => {
  assert.equal(
    fallback().isTransientGeminiFailure(new Error('Gemini solicitó una herramienta no permitida: get_patients')),
    true,
  );
  assert.equal(
    fallback().isTransientGeminiFailure(new Error('Gemini solicitó una herramienta no permitida: patient.list')),
    true,
  );
});

test('provider schema and invalid-argument failures remain non-transient', () => {
  assert.equal(fallback().isTransientGeminiFailure(new Error('INVALID_ARGUMENT: schema rejected')), false);
  assert.equal(fallback().isTransientGeminiFailure(new Error('400 invalid argument')), false);
});
