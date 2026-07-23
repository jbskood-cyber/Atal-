export type ConversationScope = 'global' | 'contextual';

export type ScopedConversationLike = {
  id: string;
  updatedAt: string;
  scope?: ConversationScope;
  contextKey?: string;
  contextSurface?: string;
};

export function inferConversationScope(conversation: ScopedConversationLike): ConversationScope {
  if (conversation.scope === 'global' || conversation.scope === 'contextual') return conversation.scope;
  return conversation.contextKey || conversation.contextSurface ? 'contextual' : 'global';
}

export function isGlobalConversation(conversation: ScopedConversationLike): boolean {
  return inferConversationScope(conversation) === 'global';
}

export function isContextualConversation(conversation: ScopedConversationLike): boolean {
  return inferConversationScope(conversation) === 'contextual';
}

export function selectLatestGlobalConversation<T extends ScopedConversationLike>(conversations: T[]): T | null {
  return conversations
    .filter(isGlobalConversation)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export function selectGlobalConversationHistory<T extends ScopedConversationLike>(conversations: T[]): T[] {
  return conversations
    .filter(isGlobalConversation)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function selectContextualConversation<T extends ScopedConversationLike>(conversations: T[], contextKey: string): T | null {
  return conversations
    .filter((conversation) => isContextualConversation(conversation) && conversation.contextKey === contextKey)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}
