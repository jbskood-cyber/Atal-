import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const runtimePolicy = () => loadCore('src/features/atal-ai/core/agentic/geminiRuntimePolicy.js');

test('Gemini 3 conversational runtime constrains thinking and leaves room for visible output', () => {
  const { agentGenerationConfigForModel } = runtimePolicy();

  assert.deepEqual(agentGenerationConfigForModel('gemini-3.6-flash'), {
    maxOutputTokens: 8192,
    thinkingConfig: { thinkingLevel: 'low' },
  });
  assert.deepEqual(agentGenerationConfigForModel('gemini-3.5-flash-lite'), {
    maxOutputTokens: 8192,
    thinkingConfig: { thinkingLevel: 'minimal' },
  });
});

test('Gemini 2.5 Flash-Lite disables unnecessary thinking for operational turns', () => {
  const { agentGenerationConfigForModel } = runtimePolicy();
  assert.deepEqual(agentGenerationConfigForModel('gemini-2.5-flash-lite'), {
    maxOutputTokens: 8192,
    thinkingConfig: { thinkingBudget: 0 },
  });
});

test('empty provider turns retain safe finish metadata for diagnosis without prompt content', () => {
  const { emptyModelTurnError } = runtimePolicy();
  const error = emptyModelTurnError('gemini-3.5-flash', {
    finishReason: 'MAX_TOKENS',
    thoughtsTokenCount: 2048,
    candidatesTokenCount: 0,
  });

  assert.match(error.message, /^MODEL_EMPTY_RESPONSE /);
  assert.match(error.message, /model=gemini-3\.5-flash/);
  assert.match(error.message, /finishReason=MAX_TOKENS/);
  assert.match(error.message, /thoughtsTokenCount=2048/);
  assert.match(error.message, /candidatesTokenCount=0/);
  assert.doesNotMatch(error.message, /Solicitud del fisioterapeuta|patient|prompt=/i);
});
