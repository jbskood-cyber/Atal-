import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const scopeModule = () => loadCore('src/features/atal-ai/core/agentic/conversationScope.js');

const globalConversation = { id: 'global-1', updatedAt: '2026-07-23T10:00:00.000Z', scope: 'global' };
const legacyGlobal = { id: 'legacy-global', updatedAt: '2026-07-23T11:00:00.000Z' };
const patientConversation = { id: 'patient-1', updatedAt: '2026-07-23T12:00:00.000Z', scope: 'contextual', contextKey: 'patient:p01', contextSurface: 'patient' };
const planConversation = { id: 'plan-1', updatedAt: '2026-07-23T13:00:00.000Z', contextKey: 'plan:p01:pl01', contextSurface: 'plan' };

test('legacy conversations without contextual metadata migrate to global scope', () => {
  const { inferConversationScope } = scopeModule();
  assert.equal(inferConversationScope(legacyGlobal), 'global');
  assert.equal(inferConversationScope(planConversation), 'contextual');
});

test('latest global conversation never selects a newer contextual conversation', () => {
  const { selectLatestGlobalConversation } = scopeModule();
  const selected = selectLatestGlobalConversation([globalConversation, patientConversation, legacyGlobal, planConversation]);
  assert.equal(selected?.id, 'legacy-global');
});

test('global history excludes every contextual screen instance', () => {
  const { selectGlobalConversationHistory } = scopeModule();
  assert.deepEqual(selectGlobalConversationHistory([patientConversation, globalConversation, planConversation, legacyGlobal]).map((item) => item.id), ['legacy-global', 'global-1']);
});

test('contextual selection remains isolated by exact context key', () => {
  const { selectContextualConversation } = scopeModule();
  assert.equal(selectContextualConversation([patientConversation, planConversation], 'patient:p01')?.id, 'patient-1');
  assert.equal(selectContextualConversation([patientConversation, planConversation], 'patient:p02'), null);
});
