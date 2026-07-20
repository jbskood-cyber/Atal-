import { ArrowLeft, Ellipsis, History, PencilLine, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AtalMark } from '@/src/components/atal/AtalLogo';

export function AtalAIHeader({ contextLabel, hasDraft, onBack, onContext, onSave, onConversations, onRestart, onDiscard }: { contextLabel: string; hasDraft: boolean; onBack: () => void; onContext: () => void; onSave: () => void; onConversations: () => void; onRestart: () => void; onDiscard: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const action = (callback: () => void) => { setOpen(false); callback(); };
  return <header className="atal-command-header is-minimal">
    <button type="button" className="atal-command-back" aria-label="Volver" onClick={onBack}><ArrowLeft /></button>
    <button type="button" className="atal-command-context is-logo-only" onClick={onContext} aria-label={`Cambiar contexto. ${contextLabel}`}><AtalMark className="atal-command-mark" /><span className="sr-only">Atal IA. {contextLabel}</span></button>
    <button ref={triggerRef} type="button" className="atal-command-menu-trigger" aria-label="Acciones de la conversación" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Ellipsis /></button>
    {open && <><button type="button" className="atal-command-menu-backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} /><div ref={menuRef} className="atal-command-menu" role="menu">
      <button type="button" role="menuitem" onClick={() => action(onSave)}><Save /><span><b>Guardar borrador</b><small>Conservar conversación y cambios</small></span></button>
      <button type="button" role="menuitem" onClick={() => action(onConversations)}><History /><span><b>Ver conversaciones</b><small>Continuar trabajos anteriores</small></span></button>
      <button type="button" role="menuitem" onClick={() => action(onContext)}><PencilLine /><span><b>Cambiar contexto</b><small>Acción, paciente o plan</small></span></button>
      <button type="button" role="menuitem" onClick={() => action(onRestart)}><RotateCcw /><span><b>Empezar de nuevo</b><small>Nueva conversación</small></span></button>
      <button type="button" role="menuitem" className="is-danger" disabled={!hasDraft} onClick={() => action(onDiscard)}><Trash2 /><span><b>Descartar borrador</b><small>Eliminar únicamente este trabajo</small></span></button>
      <button type="button" className="atal-command-menu-close" aria-label="Cerrar" onClick={() => setOpen(false)}><X /></button>
    </div></>}
  </header>;
}
