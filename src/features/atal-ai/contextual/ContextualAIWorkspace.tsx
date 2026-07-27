'use client';

import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  Send,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AtalMark } from '@/src/components/atal/AtalLogo';
import { AssistantMessageContent } from '../components/AssistantMessageContent';
import { contextualConversationKey } from './conversationAdapter';
import { ContextualAudioCapture } from './ContextualAudioCapture';
import { useContextualAI } from './ContextualAIProvider';
import { ContextualModal } from './ContextualModal';
import { queueGlobalAIHandoff } from './globalHandoff';
import { RouteContextualAISurface } from './RouteContextualAISurface';
import { useContextualConversation } from './useContextualConversation';

export function ContextualAIWorkspace() {
  const controller = useContextualAI();
  const context = controller.session.context;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const model = useContextualConversation({
    context,
    conversationId: controller.session.conversationId,
    draftId: controller.session.draftId,
    onProposalFingerprint: controller.bindProposal,
    // Draft state remains internal. The user stays in the conversation and gets
    // one compact approval affordance instead of being moved to a draft pane.
    onDraftReady: () => controller.updateView({ activePane: 'conversation' }),
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
  }, [controller.session.mode, model.conversation?.messages.length, model.conversation?.status, model.draft?.updatedAt, model.streamingText]);

  if (controller.session.mode !== 'open' || !context || !model.conversation) return <RouteContextualAISurface />;
  if (model.conversation.contextKey !== contextualConversationKey(context)) return <RouteContextualAISurface />;

  const processing = model.conversation.status === 'processing';
  const hasText = Boolean(model.conversation.composerText.trim());
  const showPendingChange = Boolean(model.draft) && model.conversation.status !== 'saved';
  const openGlobalAssistant = () => {
    queueGlobalAIHandoff(context, model.conversation!, model.draft);
    window.location.assign('/assistant');
  };
  const closeAfterPersistenceFlush = () => {
    if (processing) return;
    // Conversation persistence is effect-driven. Closing on the next task keeps
    // the last committed assistant/user turn from being dropped on unmount.
    window.setTimeout(controller.close, 0);
  };

  return <>
    <RouteContextualAISurface />
    <section
      className="atal-contextual-workspace atal-contextual-workspace--linear"
      role="dialog"
      aria-modal="true"
      aria-label={`Asistente ${context.contextLabel}`}
      data-conversation-id={controller.session.conversationId}
      data-context-surface={context.surface}
      data-patient-id={context.patientId}
      data-record-id={context.clinicalRecordId}
      data-plan-id={context.planId}
      data-exercise-id={context.exerciseId}
      data-session-id={context.sessionId}
      data-report-id={context.reportId}
    >
      <header className="atal-contextual-workspace-header">
        <span className="atal-contextual-workspace-mark"><AtalMark /></span>
        <div>
          <h2 ref={titleRef} tabIndex={-1}>Atal IA</h2>
          <span><b>{context.contextLabel}</b><small>{context.entityLabel}</small></span>
        </div>
        <button type="button" aria-label="Minimizar asistente" onClick={controller.minimize}><Minus /></button>
        <button type="button" aria-label="Cerrar asistente" disabled={processing} onClick={closeAfterPersistenceFlush}><X /></button>
      </header>

      <div className="atal-contextual-work-area">
        <section className="atal-contextual-conversation is-active" aria-label="Conversación contextual" aria-live="polite">
          {!model.conversation.messages.length && !model.streamingText && <div className="atal-contextual-empty"><AtalMark /><b>¿Qué necesitas hacer aquí?</b><p>Atal ya conoce el contexto de {context.entityLabel}.</p></div>}

          {model.conversation.messages.map((message) => <article key={message.id} className={`is-${message.role}`}>
            {message.role === 'assistant'
              ? <div className="atal-contextual-assistant-copy"><AssistantMessageContent text={message.text} /></div>
              : <div className="atal-contextual-user-bubble"><p>{message.text}</p></div>}
          </article>)}

          {model.streamingText && <article className="is-assistant is-streaming"><div className="atal-contextual-assistant-copy"><AssistantMessageContent text={model.streamingText} streaming /></div></article>}

          {processing && !model.streamingText && <div className="atal-contextual-processing" role="status"><LoaderCircle className="is-spinning" /><span><b>Atal está trabajando…</b></span></div>}
          {model.conversation.error && <div className="atal-contextual-error" role="alert"><AlertTriangle /><span><b>No pudimos completar la solicitud</b><small>{model.conversation.error}</small></span></div>}

          {showPendingChange && <section className="atal-contextual-pending-change" aria-label="Cambios listos para aplicar">
            <p>{model.draft?.assistantMessage || 'Hay cambios listos para guardar en Atal.'}</p>
            {model.conflict && <small role="alert">La información cambió desde que se preparó esta propuesta. Actualízala antes de aplicar.</small>}
            <button type="button" disabled={model.applying || Boolean(model.conflict)} onClick={model.apply}>
              {model.applying ? 'Aplicando…' : 'Aplicar cambios'}
            </button>
            {model.conflict && <div className="atal-contextual-conflict-actions">
              <button type="button" onClick={model.refreshConflict}>Actualizar</button>
              <button type="button" onClick={() => setCompareOpen(true)}>Comparar</button>
              <button type="button" onClick={model.keepVersion}>Conservar mi versión</button>
            </div>}
          </section>}

          <div ref={endRef} />
        </section>
      </div>

      {model.conversation.savedResult && <details className="atal-contextual-result atal-contextual-result--compact" aria-live="polite">
        <summary><CheckCircle2 /><span>Cambios aplicados</span></summary>
        <div>
          <ul>{model.conversation.savedResult.summary.map((item) => <li key={item}>{item}</li>)}</ul>
          {model.conversation.savedResult.undo && <button type="button" onClick={model.undo}>Deshacer cambio</button>}
        </div>
      </details>}

      <footer className="atal-contextual-compose-zone">
        {model.notice && <p className="atal-contextual-notice" role="status">{model.notice}<button type="button" aria-label="Cerrar aviso" onClick={model.clearNotice}><X /></button></p>}
        {menuOpen && <div className="atal-contextual-plus-menu"><button type="button" onClick={openGlobalAssistant}>Abrir Atal IA completa<Maximize2 /></button><button type="button" onClick={() => model.setText('')}>Limpiar mensaje<X /></button></div>}
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
          {processing ? <button type="button" className="is-send" aria-label="Cancelar procesamiento" onClick={model.cancelProcessing}><X /></button>
            : hasText ? <button type="button" className="is-send" aria-label="Enviar mensaje" onClick={model.send}><Send /></button>
              : <ContextualAudioCapture onTranscript={model.setText} />}
        </div>
      </footer>

      {model.confirmationOpen && <ContextualModal className="atal-contextual-confirm-layer" labelledBy="atal-contextual-confirm-title" onCancel={model.cancelConfirmation}>
        <section>
          <h3 id="atal-contextual-confirm-title">Aplicar cambios</h3>
          <p>{model.draft?.assistantMessage || model.conversation.agentTask?.finalText || 'Esta acción modificará los datos de Atal.'}</p>
          <button type="button" className="is-primary" onClick={model.confirmExecution}>Aplicar cambios</button>
          <button type="button" onClick={model.cancelConfirmation}>Cancelar</button>
        </section>
      </ContextualModal>}

      {compareOpen && model.draft && <ContextualModal className="atal-contextual-confirm-layer" label="Comparar cambios" onCancel={() => setCompareOpen(false)}>
        <section className="atal-contextual-compare">
          <h3>Comparar cambios</h3>
          <p>Revisa la propuesta antes de decidir qué versión conservar.</p>
          <button type="button" onClick={() => setCompareOpen(false)}>Cerrar</button>
        </section>
      </ContextualModal>}
    </section>
  </>;
}