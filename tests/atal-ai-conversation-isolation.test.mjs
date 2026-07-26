import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCore } from './helpers/core-modules.mjs';

const scope = () => loadCore('src/features/atal-ai/core/agentic/conversationScope.js');

function conversation({ id, updatedAt, scope: conversationScope, contextKey }) {
  return { id, updatedAt, scope: conversationScope, ...(contextKey ? { contextKey } : {}) };
}

test('contextual lookup by id rejects a global conversation even when the id matches', () => {
  const conversations = [
    conversation({ id: 'shared-id', updatedAt: '2026-07-24T12:00:00.000Z', scope: 'global' }),
  ];

  assert.equal(
    scope().selectContextualConversationById(conversations, 'shared-id', 'patient:patient-a'),
    null,
  );
});

test('contextual lookup by id rejects a conversation from another context key', () => {
  const conversations = [
    conversation({ id: 'context-id', updatedAt: '2026-07-24T12:00:00.000Z', scope: 'contextual', contextKey: 'patient:patient-b' }),
  ];

  assert.equal(
    scope().selectContextualConversationById(conversations, 'context-id', 'patient:patient-a'),
    null,
  );
});

test('contextual lookup by id accepts only the matching contextual instance', () => {
  const matching = conversation({ id: 'context-id', updatedAt: '2026-07-24T12:00:00.000Z', scope: 'contextual', contextKey: 'patient:patient-a' });
  const conversations = [matching];

  assert.equal(
    scope().selectContextualConversationById(conversations, 'context-id', 'patient:patient-a'),
    matching,
  );
});

test('contextual selector refuses id-only lookup when contextKey is omitted', () => {
  const conversations = [
    conversation({ id: 'context-id', updatedAt: '2026-07-24T12:00:00.000Z', scope: 'contextual', contextKey: 'patient:patient-a' }),
  ];

  assert.equal(scope().selectContextualConversationById(conversations, 'context-id'), null);
});

test('global history excludes contextual conversations even when they are newer', () => {
  const global = conversation({ id: 'global-id', updatedAt: '2026-07-24T12:00:00.000Z', scope: 'global' });
  const contextual = conversation({ id: 'context-id', updatedAt: '2026-07-24T13:00:00.000Z', scope: 'contextual', contextKey: 'patient:patient-a' });

  assert.deepEqual(scope().selectGlobalConversationHistory([contextual, global]), [global]);
  assert.equal(scope().selectLatestGlobalConversation([contextual, global]), global);
});

test('contextual repository lookup must require contextKey instead of trusting conversationId alone', () => {
  const source = fs.readFileSync('src/features/atal-ai/contextual/repository.ts', 'utf8');
  assert.match(source, /readConversationById\(id:\s*string,\s*contextKey:\s*string\)/);
  assert.match(source, /selectContextualConversationById\(readAIConversations\(\),\s*id,\s*contextKey\)/);
});

test('contextual hook must bind conversation loading to the current context key', () => {
  const source = fs.readFileSync('src/features/atal-ai/contextual/useContextualConversation.ts', 'utf8');
  assert.match(source, /contextualConversationKey/);
  assert.match(source, /readConversationById\(conversationId,\s*contextKey\)/);
  assert.match(source, /\[conversationId,\s*contextKey\]/);
});
