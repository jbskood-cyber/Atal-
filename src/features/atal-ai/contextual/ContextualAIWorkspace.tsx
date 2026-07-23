'use client';

import { ChevronRight, Maximize2, MessageSquareText, Minus, MoreHorizontal, Plus, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AtalMark } from '@/src/components/atal/AtalLogo';
import { useAtalStore } from '@/src/data/atalStore';
import { contextualActionsFor } from './actions';
import { useContextualAI } from './ContextualAIProvider';
import { readConversationById } from './repository';
import { contextualSuggestionsFor } from './suggestions';

export function ContextualAIWorkspace() {
  const controller = useContextualAI();
  const context = controller.session.context;
  const store = useAtalStore((state) => state);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [composer, setComposer] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const conversation = useMemo(
    () => controller.session.conversationId ? readConversationById(controller.session.conversationId) : null,
    [controller.session.conversationId, controller.session.mode],
  );
  const actions = useMemo(() => context ? contextualActionsFor(context, store, 'internal') : [], [context, store]);
  const suggestions = useMemo(() => context ? contextualSuggestionsFor(context, store) : [], [context, store]);

  useEffect(() => {
    if (controller.session.mode !== 'open') return;
    window.requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  }, [controller.session.mode]);

  useEffect(() => {
    if (!controller.queuedAction || controller.session.mode !== 'open') return;
    const action = controller.consumeQueuedAction();
    if (action) setComposer(action.prompt);
  }, [controller, controller.queuedAction, controller.session.mode]);

  if (controller.session.mode !== 'open' || !context) return null;

  const selectAction = (prompt: string) => setComposer(prompt);
  const send = () => {
    if (!composer.trim()) return;
    setComposer('');
  };

  return <section
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
      {actions.map((action) => <button type="button" key={action.id} onClick={() => selectAction(action.prompt)}><Sparkles /><span>{action.label}</span></button>)}
    </div>

    {suggestions.length > 0 && <div className="atal-contextual-suggestions" aria-label="Sugerencias de Atal IA">
      {suggestions.map((suggestion) => <button type="button" key={suggestion.id} onClick={() => {
        const action = actions.find((item) => item.id === suggestion.actionId);
        if (action) selectAction(action.prompt);
      }}><Sparkles /><span><b>{suggestion.title}</b><small>{suggestion.reason}</small></span><ChevronRight /></button>)}
    </div>}

    <nav className="atal-contextual-pane-tabs" aria-label="Vista del asistente">
      <button type="button" className={controller.session.activePane === 'conversation' ? 'is-active' : ''} onClick={() => controller.updateView({ activePane: 'conversation' })}><MessageSquareText />Conversación</button>
      <button type="button" className={controller.session.activePane === 'draft' ? 'is-active' : ''} onClick={() => controller.updateView({ activePane: 'draft' })}><Sparkles />Borrador</button>
    </nav>

    <div className="atal-contextual-work-area">
      <section className={`atal-contextual-conversation${controller.session.activePane === 'conversation' ? ' is-active' : ''}`} aria-label="Conversación contextual">
        {conversation?.messages.length ? conversation.messages.map((message) => <article key={message.id} className={`is-${message.role}`}><span>{message.role === 'assistant' ? <AtalMark /> : <MessageSquareText />}</span><div><header><b>{message.role === 'assistant' ? 'Atal IA' : 'Tú'}</b><time>{new Date(message.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</time></header><p>{message.text}</p></div></article>) : <div className="atal-contextual-empty"><AtalMark /><b>Trabaja con Atal IA sin salir de esta pantalla</b><p>Pregunta, prepara cambios o revisa el contexto de {context.entityLabel}.</p></div>}
      </section>
      <section className={`atal-contextual-draft-pane${controller.session.activePane === 'draft' ? ' is-active' : ''}`} aria-label="Borrador contextual">
        <div className="atal-contextual-empty"><Sparkles /><b>Borrador contextual</b><p>Las propuestas estructuradas aparecerán aquí antes de aplicar cualquier cambio.</p></div>
      </section>
    </div>

    <footer className="atal-contextual-compose-zone">
      {menuOpen && <div className="atal-contextual-plus-menu"><button type="button" onClick={() => { window.location.assign('/assistant'); }}>Abrir Atal IA completa<Maximize2 /></button><button type="button" onClick={() => setComposer('')}>Limpiar mensaje<X /></button></div>}
      <div className="atal-contextual-composer">
        <button type="button" aria-label="Más opciones de Atal IA" onClick={() => setMenuOpen((value) => !value)}><Plus /></button>
        <textarea rows={1} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Escribe un mensaje…" aria-label="Mensaje para Atal IA contextual" />
        <button type="button" className="is-send" disabled={!composer.trim()} aria-label="Enviar mensaje" onClick={send}><Send /></button>
      </div>
      <small>Atal IA propone. Tú revisas y confirmas.</small>
    </footer>
  </section>;
}
