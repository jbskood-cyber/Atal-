import { createAIConversation, readAIConversations, saveAIConversation } from '../data/aiRepository';
import { selectContextualConversation } from '../core/agentic/conversationScope';
import type { AIConversation } from '../types';
import { contextualConversationKey, workContextForContext } from './conversationAdapter';
import type { ContextualAIContext } from './types';

export function readContextualConversation(context: ContextualAIContext): AIConversation | null {
  return selectContextualConversation(readAIConversations(), contextualConversationKey(context));
}

export function ensureContextualConversation(context: ContextualAIContext): AIConversation {
  const existing = readContextualConversation(context);
  if (existing) {
    const refreshed = {
      ...existing,
      scope: 'contextual' as const,
      workContext: workContextForContext(context, existing.workContext.intent),
      contextEntityLabel: context.entityLabel,
    };
    saveAIConversation(refreshed);
    return refreshed;
  }
  const created = createAIConversation('contextual');
  const conversation = {
    ...created,
    scope: 'contextual' as const,
    contextKey: contextualConversationKey(context),
    contextSurface: context.surface,
    contextEntityLabel: context.entityLabel,
    workContext: workContextForContext(context),
  };
  saveAIConversation(conversation);
  return conversation;
}

export function readConversationById(id: string): AIConversation | null {
  return readAIConversations().find((conversation) => conversation.id === id) ?? null;
}
