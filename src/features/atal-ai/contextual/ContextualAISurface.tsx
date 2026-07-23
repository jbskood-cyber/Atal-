'use client';

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

export function ContextualAISurface({ context, raised = false }: { context: ContextualAIContext; raised?: boolean }) {
  const store = useAtalStore((state) => state);
  const controller = useContextualAI();
  const actions = contextualActionsFor(context, store, 'exterior');
  const activeContext = controller.session.context && contextualAIContextKey(controller.session.context) === contextualAIContextKey(context);
  if (controller.session.mode === 'open') return null;

  const launch = (action: ContextualAIAction | undefined, element: HTMLElement) => controller.open(context, action, element);

  return <aside className={`atal-contextual-launcher${raised ? ' is-raised' : ''}`} aria-label={`Atal IA ${context.contextLabel}`}>
    <div className="atal-contextual-exterior-actions">
      {actions.map((action) => <button
        key={action.id}
        type="button"
        aria-label={`${action.label} con Atal IA`}
        onClick={(event) => launch(action, document.getElementById(triggerId(context)) ?? event.currentTarget)}
      >{actionIcon(action)}<span>{action.label}</span></button>)}
    </div>
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
}
