import { createAIConversation, readAIConversations, saveAIConversation } from '../data/aiRepository';
import type { AIConversation } from '../types';
import { contextualConversationKey, workContextForContext } from './conversationAdapter';
import type { ContextualAIContext } from './types';

export function readContextualConversation(context: ContextualAIContext): AIConversation | null {
  const key = contextualConversationKey(context);
  return readAIConversations()
    .filter((conversation) => conversation.contextKey === key)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export function ensureContextualConversation(context: ContextualAIContext): AIConversation {
  const existing = readContextualConversation(context);
  if (existing) {
    const refreshed: AIConversation = {
      ...existing,
      workContext: workContextForContext(context, existing.workContext.intent),
      contextEntityLabel: context.entityLabel,
    };
    saveAIConversation(refreshed);
    return refreshed;
  }
  const created = createAIConversation();
  const conversation: AIConversation = {
    ...created,
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
