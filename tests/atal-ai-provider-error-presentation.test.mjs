import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const presentation = () => loadCore('src/features/atal-ai/core/agentic/providerErrorPresentation.js');
const fallback = () => loadCore('src/features/atal-ai/core/agentic/modelFallback.js');

test('quota errors mentioning API key are presented as temporary provider saturation, not missing configuration', () => {
  const { safeAgentProviderMessage } = presentation();
  const message = safeAgentProviderMessage(new Error('429 RESOURCE_EXHAUSTED: quota exceeded for requests per minute per API key'));
  assert.match(message, /temporalmente ocupada/i);
  assert.doesNotMatch(message, /no está configurada|GEMINI_API_KEY/i);
});

test('actual missing or invalid credentials still use configuration guidance', () => {
  const { safeAgentProviderMessage } = presentation();
  assert.match(safeAgentProviderMessage(new Error('GEMINI_API_KEY no configurada')), /no está configurada/i);
  assert.match(safeAgentProviderMessage(new Error('401 UNAUTHENTICATED: API key not valid')), /no está configurada/i);
  assert.match(safeAgentProviderMessage(new Error('403 PERMISSION_DENIED: API key not valid')), /no está configurada/i);
});

test('draft and agent provider messages keep distinct persistence wording', () => {
  const { safeAgentProviderMessage, safeDraftProviderMessage } = presentation();
  const error = new Error('503 UNAVAILABLE: provider overloaded');
  assert.match(safeAgentProviderMessage(error), /No se perdió ningún cambio/i);
  assert.match(safeDraftProviderMessage(error), /Conservamos tu borrador/i);
});

test('terminal transient fallback errors are sanitized before reaching server presentation', async () => {
  const { runWithGeminiFallback } = fallback();
  let thrown;
  try {
    await runWithGeminiFallback({
      models: ['primary', 'fallback'],
      operation: async () => { throw new Error('429 RESOURCE_EXHAUSTED: quota exceeded per API key'); },
      sleep: async () => undefined,
    });
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error);
  assert.match(thrown.message, /503 UNAVAILABLE|GEMINI_TRANSIENT_PROVIDER_FAILURE/i);
  assert.doesNotMatch(thrown.message, /API key/i);
});
