'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { ContextualAIAction } from './actions';
import { ensureContextualConversation } from './repository';
import {
  bindPendingProposal,
  closeContextualWorkspace,
  contextualAIContextKey,
  createContextualWorkspaceSession,
  invalidateForContextChange,
  minimizeContextualWorkspace,
  openContextualWorkspace,
  restoreContextualWorkspace,
  updateContextualWorkspaceView,
} from './stateMachine';
import type { ContextualAIContext, ContextualWorkspaceSession, ContextualWorkspaceViewPatch } from './types';

type ContextualAIController = {
  session: ContextualWorkspaceSession;
  queuedAction: ContextualAIAction | null;
  open: (context: ContextualAIContext, action?: ContextualAIAction, trigger?: HTMLElement | null) => void;
  minimize: () => void;
  close: () => void;
  restore: () => void;
  updateView: (patch: ContextualWorkspaceViewPatch) => void;
  bindProposal: (fingerprint: string) => void;
  consumeQueuedAction: () => ContextualAIAction | null;
};

const ContextualAIContextValue = createContext<ContextualAIController | null>(null);

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function ContextualAIProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<ContextualWorkspaceSession>(() => createContextualWorkspaceSession());
  const [queuedAction, setQueuedAction] = useState<ContextualAIAction | null>(null);

  const restorePage = useCallback((target: ContextualWorkspaceSession) => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      window.scrollTo({ top: target.pageScrollY, behavior: 'auto' });
      if (target.triggerId) document.getElementById(target.triggerId)?.focus({ preventScroll: true });
    }));
  }, []);

  const open = useCallback((context: ContextualAIContext, action?: ContextualAIAction, trigger?: HTMLElement | null) => {
    const conversation = ensureContextualConversation(context);
    setQueuedAction(action ?? null);
    setSession((current) => {
      if (current.mode === 'minimized' && current.context && contextualAIContextKey(current.context) === contextualAIContextKey(context)) {
        return restoreContextualWorkspace(current);
      }
      return openContextualWorkspace(current, {
        context: { ...context, route: currentRoute() || context.route },
        conversationId: conversation.id,
        draftId: conversation.draftId,
        pageScrollY: typeof window === 'undefined' ? 0 : window.scrollY,
        triggerId: trigger?.id ?? '',
      });
    });
  }, []);

  const minimize = useCallback(() => {
    setSession((current) => {
      const next = minimizeContextualWorkspace(current);
      restorePage(next);
      return next;
    });
  }, [restorePage]);

  const close = useCallback(() => {
    setQueuedAction(null);
    setSession((current) => {
      const next = closeContextualWorkspace(current);
      restorePage(next);
      return next;
    });
  }, [restorePage]);

  const restore = useCallback(() => setSession((current) => restoreContextualWorkspace(current)), []);
  const updateView = useCallback((patch: ContextualWorkspaceViewPatch) => setSession((current) => updateContextualWorkspaceView(current, patch)), []);
  const bindProposal = useCallback((fingerprint: string) => setSession((current) => bindPendingProposal(current, fingerprint)), []);
  const consumeQueuedAction = useCallback(() => {
    const value = queuedAction;
    setQueuedAction(null);
    return value;
  }, [queuedAction]);

  useEffect(() => {
    if (session.mode !== 'open') return;
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${session.pageScrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    html.classList.add('atal-contextual-ai-open');
    return () => {
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      html.style.overflow = previous.htmlOverflow;
      html.classList.remove('atal-contextual-ai-open');
      window.scrollTo({ top: session.pageScrollY, behavior: 'auto' });
    };
  }, [session.mode, session.pageScrollY]);

  useEffect(() => {
    if (!session.context || session.mode === 'closed') return;
    const route = currentRoute();
    if (!route || route === session.capturedRoute) return;
    setQueuedAction(null);
    setSession((current) => closeContextualWorkspace(invalidateForContextChange(current, current.context ?? session.context!)));
  }, [pathname, session.capturedRoute, session.context, session.mode]);

  const value = useMemo<ContextualAIController>(() => ({
    session,
    queuedAction,
    open,
    minimize,
    close,
    restore,
    updateView,
    bindProposal,
    consumeQueuedAction,
  }), [session, queuedAction, open, minimize, close, restore, updateView, bindProposal, consumeQueuedAction]);

  return <ContextualAIContextValue.Provider value={value}>{children}</ContextualAIContextValue.Provider>;
}

export function useContextualAI() {
  const value = useContext(ContextualAIContextValue);
  if (!value) throw new Error('useContextualAI must be used inside ContextualAIProvider.');
  return value;
}
