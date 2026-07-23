import type { AIConversation, AtalAIDraft, AIWorkContext } from '../types';
import { contextualConversationKey, workContextForContext } from './conversationAdapter';
import type { ContextualAIContext } from './types';

const GLOBAL_HANDOFF_KEY = 'atal:ai-global-handoff:v1';
const MAX_HANDOFF_AGE_MS = 10 * 60_000;

export type GlobalAIHandoff = {
  sourceConversationId: string;
  sourceContextKey: string;
  sourceEntityLabel: string;
  workContext: AIWorkContext;
  prompt: string;
  draftSnapshot?: AtalAIDraft;
  createdAt: string;
};

export function buildGlobalAIHandoff(
  context: ContextualAIContext,
  conversation: AIConversation,
  draft: AtalAIDraft | null,
  createdAt = new Date().toISOString(),
): GlobalAIHandoff {
  const lastUserMessage = conversation.messages.findLast((message) => message.role === 'user')?.text.trim();
  const prompt = draft
    ? `Continúa en el asistente general con el borrador preparado para ${context.entityLabel}.`
    : lastUserMessage
      ? `Continúa el trabajo sobre ${context.entityLabel}: ${lastUserMessage}`
      : `Continúa el trabajo sobre ${context.entityLabel}.`;
  return {
    sourceConversationId: conversation.id,
    sourceContextKey: contextualConversationKey(context),
    sourceEntityLabel: context.entityLabel,
    workContext: workContextForContext(context, draft?.intent ?? conversation.workContext.intent),
    prompt,
    draftSnapshot: draft ? structuredClone(draft) : undefined,
    createdAt,
  };
}

export function queueGlobalAIHandoff(context: ContextualAIContext, conversation: AIConversation, draft: AtalAIDraft | null): void {
  sessionStorage.setItem(GLOBAL_HANDOFF_KEY, JSON.stringify(buildGlobalAIHandoff(context, conversation, draft)));
}

export function consumeGlobalAIHandoff(now = Date.now()): GlobalAIHandoff | null {
  const raw = sessionStorage.getItem(GLOBAL_HANDOFF_KEY);
  sessionStorage.removeItem(GLOBAL_HANDOFF_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<GlobalAIHandoff>;
    if (!value.sourceConversationId || !value.sourceContextKey || !value.sourceEntityLabel || !value.workContext || !value.createdAt || !value.prompt) return null;
    const created = Date.parse(value.createdAt);
    if (!Number.isFinite(created) || now - created > MAX_HANDOFF_AGE_MS) return null;
    return value as GlobalAIHandoff;
  } catch {
    return null;
  }
}
