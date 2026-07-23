import { useRef } from 'react';
import { createAIConversation, saveAIConversation, saveAIDraft } from './data/aiRepository';
import { consumeGlobalAIHandoff } from './contextual/globalHandoff';
import { AtalAIGeneralScreen } from './AtalAIGeneralScreen';
import type { AIMessage } from './types';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function AtalAIGeneralEntry() {
  const prepared = useRef(false);
  if (!prepared.current) {
    prepared.current = true;
    const handoff = consumeGlobalAIHandoff();
    if (handoff) {
      const conversation = createAIConversation('global');
      const now = new Date().toISOString();
      const transferredMessage: AIMessage = {
        id: uid('message'),
        role: 'assistant',
        text: handoff.draftSnapshot
          ? `Abrí una copia independiente del borrador de ${handoff.sourceEntityLabel}. Puedes revisarla y continuar aquí.`
          : `Contexto recibido desde ${handoff.sourceEntityLabel}. La conversación contextual permanece separada.`,
        createdAt: now,
        attachments: [],
      };
      const nextConversation = {
        ...conversation,
        workContext: handoff.workContext,
        composerText: handoff.draftSnapshot ? '' : handoff.prompt,
        messages: [transferredMessage],
        status: handoff.draftSnapshot ? 'ready_for_review' as const : 'composing' as const,
        updatedAt: now,
      };
      if (handoff.draftSnapshot) {
        saveAIDraft({
          ...handoff.draftSnapshot,
          id: conversation.draftId,
          createdAt: now,
          updatedAt: now,
          baseVersions: { ...handoff.draftSnapshot.baseVersions },
        });
      }
      saveAIConversation(nextConversation);
    }
  }
  return <AtalAIGeneralScreen />;
}
