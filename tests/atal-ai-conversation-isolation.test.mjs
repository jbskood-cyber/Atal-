import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('contextual repository and hook bind conversation id lookup to the current context key', () => {
  const repository = readFileSync('src/features/atal-ai/contextual/repository.ts', 'utf8');
  const hook = readFileSync('src/features/atal-ai/contextual/useContextualConversation.ts', 'utf8');

  assert.match(repository, /readConversationById\(id: string, contextKey: string\)/);
  assert.match(repository, /selectContextualConversationById\(readAIConversations\(\), id, contextKey\)/);
  assert.match(hook, /readConversationById\(conversationId, contextualConversationKey\(context\)\)/);
});
