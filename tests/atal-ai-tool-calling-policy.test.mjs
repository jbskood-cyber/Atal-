import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const policy = () => loadCore('src/features/atal-ai/core/agentic/toolCallingPolicy.js');

test('conversation-only turns never force a tool', () => {
  assert.equal(policy().shouldRequireAgentToolCall([], []), false);
});

test('the first grounded turn requires one of the exposed Atal tools', () => {
  assert.equal(policy().shouldRequireAgentToolCall(['app.read', 'patient.search'], []), true);
});

test('after a tool result Gemini returns to free AUTO reasoning', () => {
  const history = [{ role: 'user', parts: [{ functionResponse: { name: 'atal_app_read', response: { output: { status: 'success' } } } }] }];
  assert.equal(policy().shouldRequireAgentToolCall(['app.read', 'patient.search'], history), false);
});
