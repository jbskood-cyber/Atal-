'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  Minus,
  Plus,
  Send,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AtalMark } from '@/src/components/atal/AtalLogo';
import { useAtalStore } from '@/src/data/atalStore';
import { ConversationalDraftCard } from '../components/ConversationalDraftCard';
import { contextualActionsFor } from './actions';
import { useContextualAI } from './ContextualAIProvider';
import { RouteContextualAISurface } from './RouteContextualAISurface';
import { contextualSuggestionsFor } from './suggestions';
import { useContextualConversation } from './useContextualConversation';

export function ContextualAIWorkspace() {
  const controller = useContextualAI();
  const context = controller.session.context;
  const store = useAtalStore((state) => state);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const actions = useMemo(() => context ? contextualActionsFor(context, store, 'internal') : [], [context, store]);
  const suggestions = useMemo(() => context ? contextualSuggestionsFor(context, store) : [], [context, store]);
  const model = useContextualConversation({
    context,
    conversationId: controller.session.conversationId,
    draftId: controller.session.draftId,
    onProposalFingerprint: controller.bindProposal,
    onDraftReady: () => controller.updateView({ activePane: 'draft' }),
  });

  useEffect(() => {
    if (controller.session.mode !== 'open') return;
    window.requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  }, [controller.session.mode]);

  useEffect(() => {
    if (!controller.queuedAction || controller.session.mode !== 'open') return;
    const action = controller.consumeQueuedAction();
    if (action) model.prepareAction(action);
  }, [controller.queuedAction, controller.session.mode, controller.consumeQueuedAction, model.prepareAction]);

  useEffect(() => {
    if (controller.session.mode !== 'open') return;
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [controller.session.mode, model.conversation?.messages.length, model.conversation?.status, model.draft?.updatedAt]);

  if (controller.session.mode !== 'open' || !context || !model.conversation) return <RouteContextualAISurface />;

  const processing = model.conversation.status === 'processing';
  const hasText = Boolean(model.conversation.composerText.trim());

  return <>
    <RouteContextualAISurface />
    <section
      className="atal-contextual-workspace"
      role="dialog"
      aria-modal="true"
      aria-label={`Asistente ${context.contextLabel}`}
      data-conversation-id={controller.session.conversationId}
    >
      <header className="atal-contextual-workspace-header">
        <span className="atal-contextual-workspace-mark"><AtalMark /></span>
        <div>
          <h2 ref={titleRef} tabIndex={-1}>Asistente</h2>
          <span><b>{context.contextLabel}</b><small>{context.entityLabel}</small></span>
        </div>
        <button type="button" aria-label="Minimizar asistente" onClick={controller.minimize}><Minus /></button>
        <button type="button" aria-label="Cerrar asistente" onClick={controller.close}><X /></button>
      </header>

      <div className="atal-contextual-workspace-actions" aria-label="Acciones contextuales">
        {actions.map((action) => <button type="button" key={action.id} onClick={() => model.prepareAction(action)}><Sparkles /><span>{action.label}</span></button>)}
      </div>

      {suggestions.length > 0 && <div className="atal-contextual-suggestions" aria-label="Sugerencias de Atal IA">
        {suggestions.map((suggestion) => <button type="button" key={suggestion.id} onClick={() => {
          const action = actions.find((item) => item.id === suggestion.actionId);
          if (action) model.prepareAction(action);
        }}><Sparkles /><span><b>{suggestion.title}</b><small>{suggestion.reason}</small></span><ChevronRight /></button>)}
      </div>}

      <nav className="atal-contextual-pane-tabs" aria-label="Vista del asistente">
        <button type="button" className={controller.session.activePane === 'conversation' ? 'is-active' : ''} onClick={() => controller.updateView({ activePane: 'conversation' })}><MessageSquareText />Conversación</button>
        <button type="button" className={controller.session.activePane === 'draft' ? 'is-active' : ''} onClick={() => controller.updateView({ activePane: 'draft' })}><Sparkles />Borrador</button>
      </nav>

      <div className="atal-contextual-work-area">
        <section className={`atal-contextual-conversation${controller.session.activePane === 'conversation' ? ' is-active' : ''}`} aria-label="Conversación contextual" aria-live="polite">
          {!model.conversation.messages.length && <div className="atal-contextual-empty"><AtalMark /><b>Trabaja con Atal IA sin salir de esta pantalla</b><p>Pregunta, prepara cambios o revisa el contexto de {context.entityLabel}.</p></div>}
          {model.conversation.messages.map((message) => <article key={message.id} className={`is-${message.role}`}><span>{message.role === 'assistant' ? <AtalMark /> : <UserRound />}</span><div><header><b>{message.role === 'assistant' ? 'Atal IA' : 'Tú'}</b><time>{new Date(message.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</time></header><p>{message.text}</p></div></article>)}
          {processing && <div className="atal-contextual-processing" role="status"><LoaderCircle className="is-spinning" /><span><b>Comprobando información…</b><small>Atal IA está trabajando sobre el contexto fijado</small></span></div>}
          {model.conversation.error && <div className="atal-contextual-error" role="alert"><AlertTriangle /><span><b>No pudimos completar la solicitud</b><small>{model.conversation.error}</small></span></div>}
          {model.conversation.savedResult && <section className="atal-contextual-result"><CheckCircle2 /><div><b>Cambios aplicados</b><ul>{model.conversation.savedResult.summary.map((item) => <li key={item}>{item}</li>)}</ul>{model.conversation.savedResult.undo && <button type="button" onClick={model.undo}>Deshacer cambio</button>}</div></section>}
          <div ref={endRef} />
        </section>

        <section className={`atal-contextual-draft-pane${controller.session.activePane === 'draft' ? ' is-active' : ''}`} aria-label="Borrador contextual">
          {model.draft ? <ConversationalDraftCard
            draft={model.draft}
            patientLabel={model.patientLabel}
            applying={model.applying}
            applied={model.conversation.status === 'saved'}
            conflict={model.conflict}
            onChange={model.updateDraft}
            onApply={model.apply}
            onReviewAll={() => window.location.assign(`/assistant/drafts/${model.draft?.id}`)}
            onRefreshConflict={model.refreshConflict}
            onCompare={() => setCompareOpen(true)}
            onKeepVersion={model.keepVersion}
          /> : <div className="atal-contextual-empty"><Sparkles /><b>Borrador contextual</b><p>Las propuestas estructuradas aparecerán aquí antes de aplicar cualquier cambio.</p></div>}
        </section>
      </div>

      <footer className="atal-contextual-compose-zone">
        {model.notice && <p className="atal-contextual-notice" role="status"><Sparkles />{model.notice}<button type="button" aria-label="Cerrar aviso" onClick={model.clearNotice}><X /></button></p>}
        {menuOpen && <div className="atal-contextual-plus-menu"><button type="button" onClick={() => { window.location.assign('/assistant'); }}>Abrir Atal IA completa<Maximize2 /></button><button type="button" onClick={() => model.setText('')}>Limpiar mensaje<X /></button></div>}
        <div className="atal-contextual-composer">
          <button type="button" aria-label="Más opciones de Atal IA" onClick={() => setMenuOpen((value) => !value)}><Plus /></button>
          <textarea
            rows={1}
            value={model.conversation.composerText}
            onChange={(event) => model.setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                model.send();
              }
            }}
            placeholder="Escribe un mensaje…"
            aria-label="Mensaje para Atal IA contextual"
          />
          <button
            type="button"
            className="is-send"
            disabled={!processing && !hasText}
            aria-label={processing ? 'Cancelar procesamiento' : 'Enviar mensaje'}
            onClick={processing ? model.cancelProcessing : model.send}
          >{processing ? <X /> : <Send />}</button>
        </div>
        <small>Atal IA propone. Tú revisas y confirmas.</small>
      </footer>

      {model.confirmationOpen && <div className="atal-contextual-confirm-layer" role="dialog" aria-modal="true" aria-labelledby="atal-contextual-confirm-title">
        <section>
          <AlertTriangle />
          <h3 id="atal-contextual-confirm-title">¿Aplicar esta acción?</h3>
          <p>{model.draft?.assistantMessage || 'La acción modificará datos de Atal y quedará registrada en el historial.'}</p>
          <button type="button" className="is-primary" onClick={model.confirmExecution}>Confirmar y aplicar</button>
          <button type="button" onClick={model.cancelConfirmation}>Cancelar</button>
        </section>
      </div>}

      {compareOpen && model.draft && <div className="atal-contextual-confirm-layer" role="dialog" aria-modal="true" aria-label="Comparar cambios">
        <section className="atal-contextual-compare">
          <h3>Comparar cambios</h3>
          <p>Revisa el borrador contextual antes de decidir si conservas o actualizas la versión.</p>
          <button type="button" onClick={() => setCompareOpen(false)}>Cerrar</button>
        </section>
      </div>}
    </section>
  </>;
}
