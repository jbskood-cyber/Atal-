import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useModalIsolation } from './useModalIsolation';

export type AppSelectOption = string | { value: string; label: string; detail?: string };

function optionValue(option: AppSelectOption) { return typeof option === 'string' ? option : option.value; }
function optionLabel(option: AppSelectOption) { return typeof option === 'string' ? option : option.label; }

export function AppSelect({ label, value, options, icon, triggerLabel, className = '', onChange }: { label: string; value: string; options: AppSelectOption[]; icon?: React.ReactNode; triggerLabel?: string; className?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); window.setTimeout(() => triggerRef.current?.focus(), 0); };
  useModalIsolation(open);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [open]);
  return <>
    <button ref={triggerRef} type="button" className={`atal-app-select ${className}`.trim()} aria-label={`${label}: ${value}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}>{icon}<span>{triggerLabel ?? value}</span><ChevronDown /></button>
    {open && <div className="atal-select-overlay" onMouseDown={close}><section role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onMouseDown={(event) => event.stopPropagation()}><header><h2 id={`${id}-title`}>{label}</h2><button ref={closeRef} type="button" onClick={close} aria-label="Cerrar selector"><X /></button></header><div id={id} role="listbox" aria-label={label}>{options.map((option) => { const nextValue=optionValue(option);const selected=nextValue===value;return <button type="button" role="option" aria-selected={selected} key={nextValue} className={selected?'is-selected':''} onClick={() => { onChange(nextValue); close(); }}><span><b>{optionLabel(option)}</b>{typeof option!=='string'&&option.detail&&<small>{option.detail}</small>}</span>{selected&&<Check />}</button>;})}</div></section></div>}
  </>;
}
