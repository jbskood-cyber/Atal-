import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

export function AppSelect({ label, value, options, icon, onChange }: { label: string; value: string; options: string[]; icon?: React.ReactNode; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); window.setTimeout(() => triggerRef.current?.focus(), 0); };
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [open]);
  return <>
    <button ref={triggerRef} type="button" className="atal-app-select" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}>{icon}<span>{value}</span><ChevronDown /></button>
    {open && <div className="atal-select-overlay" onMouseDown={close}><section role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onMouseDown={(event) => event.stopPropagation()}><header><h2 id={`${id}-title`}>{label}</h2><button ref={closeRef} type="button" onClick={close} aria-label="Cerrar selector"><X /></button></header><div id={id} role="listbox" aria-label={label}>{options.map((option) => <button type="button" role="option" aria-selected={option === value} key={option} className={option === value ? 'is-selected' : ''} onClick={() => { onChange(option); close(); }}><span>{option}</span>{option === value && <Check />}</button>)}</div></section></div>}
  </>;
}
