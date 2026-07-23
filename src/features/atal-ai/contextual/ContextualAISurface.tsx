'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Activity, ContactRound, FilePlus2, Sparkles } from 'lucide-react';
import { AtalMark } from '@/src/components/atal/AtalLogo';
import { useAtalStore } from '@/src/data/atalStore';
import { contextualActionsFor, type ContextualAIAction } from './actions';
import { contextualAIContextKey } from './stateMachine';
import type { ContextualAIContext } from './types';
import { useContextualAI } from './ContextualAIProvider';

const actionIcon = (action: ContextualAIAction) => {
  if (action.id === 'update-contact') return <ContactRound />;
  if (action.id === 'view-progress' || action.id === 'compare-evolution') return <Activity />;
  if (action.id === 'create-note' || action.id === 'prepare-observation') return <FilePlus2 />;
  return <Sparkles />;
};

function triggerId(context: ContextualAIContext) {
  const id = context.patientId || context.planId || context.exerciseId || context.sessionId || context.reportId || 'context';
  return `atal-contextual-trigger-${context.surface}-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function useEndOfPage(route: string) {
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const scrollingElement = document.scrollingElement ?? document.documentElement;
        const remaining = scrollingElement.scrollHeight - (scrollingElement.scrollTop + window.innerHeight);
        const scrollable = scrollingElement.scrollHeight > window.innerHeight + 1;
        setAtEnd(scrollable && remaining <= 96);
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resizeObserver?.observe(document.documentElement);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      resizeObserver?.disconnect();
    };
  }, [route]);

  return atEnd;
}

export function ContextualAISurface({ context }: { context: ContextualAIContext }) {
  const store = useAtalStore((state) => state);
  const controller = useContextualAI();
  const actions = contextualActionsFor(context, store, 'exterior');
  const atEndOfPage = useEndOfPage(context.route);
  const activeContext = controller.session.context && contextualAIContextKey(controller.session.context) === contextualAIContextKey(context);
  if (controller.session.mode === 'open' || controller.launcherSuppressed || typeof document === 'undefined') return null;

  const launch = (action: ContextualAIAction | undefined, element: HTMLElement) => controller.open(context, action, element);
  const launcher = <aside className="atal-contextual-launcher" aria-label={`Atal IA ${context.contextLabel}`}>
    {!atEndOfPage && actions.length > 0 && <div className="atal-contextual-exterior-actions">
      {actions.map((action) => <button
        key={action.id}
        type="button"
        aria-label={`${action.label} con Atal IA`}
        onClick={(event) => launch(action, document.getElementById(triggerId(context)) ?? event.currentTarget)}
      >{actionIcon(action)}<span>{action.label}</span></button>)}
    </div>}
    <button
      id={triggerId(context)}
      type="button"
      className={`atal-contextual-orb${controller.session.mode === 'minimized' && activeContext ? ' has-session' : ''}`}
      aria-label={`Abrir Atal IA ${context.contextLabel}`}
      onClick={(event) => launch(undefined, event.currentTarget)}
    >
      <AtalMark />
      <span className="atal-contextual-orb-status" aria-hidden="true" />
    </button>
  </aside>;

  return createPortal(launcher, document.body);
}
