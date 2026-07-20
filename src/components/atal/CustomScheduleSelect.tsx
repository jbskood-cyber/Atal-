import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

type Mode = 'duration' | 'frequency';

export function CustomScheduleSelect({ label, value, mode, options, icon, onChange }: { label: string; value: string; mode: Mode; options: string[]; icon: React.ReactNode; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState(mode === 'duration' ? '5' : '3');
  const [unit, setUnit] = useState(mode === 'duration' ? 'semanas' : 'por semana');
  const [freeText, setFreeText] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = () => { setOpen(false); setCustom(false); window.setTimeout(() => triggerRef.current?.focus(), 0); };
  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add('atal-overlay-open');
    closeRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', keyboard);
    return () => {
      document.documentElement.classList.remove('atal-overlay-open');
      window.removeEventListener('keydown', keyboard);
    };
  }, [open]);
  const saveCustom = () => {
    const next = freeText.trim() || (mode === 'duration' ? `${amount || 1} ${unit}` : `${amount || 1} ${Number(amount) === 1 ? 'vez' : 'veces'} ${unit}`);
    onChange(next);
    close();
  };

  return <>
    <button ref={triggerRef} type="button" className="atal-app-select atal-schedule-select" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{icon}<span>{value}</span><ChevronDown /></button>
    {open && <div className="atal-select-overlay" onMouseDown={close}><section className="atal-custom-select-sheet" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event) => event.stopPropagation()}>
      <header><h2>{label}</h2><button ref={closeRef} type="button" aria-label="Cerrar" onClick={close}><X /></button></header>
      {!custom ? <div className="atal-select-options" role="listbox" aria-label={label}>
        {options.map((option) => { const selected = option === value; return <button type="button" role="option" aria-selected={selected} key={option} className={selected ? 'is-selected' : ''} onClick={() => { onChange(option); close(); }}><span>{option}</span>{selected && <Check />}</button>; })}
        <button type="button" className="atal-custom-option" onClick={() => setCustom(true)}><span>Personalizar</span><ChevronDown /></button>
      </div> : <div className="atal-custom-schedule">
        <button type="button" className="atal-inline-back" onClick={() => setCustom(false)}>← Opciones rápidas</button>
        <div className="atal-custom-schedule-grid">
          <label><span>{mode === 'duration' ? 'Cantidad' : 'Sesiones'}</span><input inputMode="numeric" min="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <div className="atal-custom-unit"><span>Unidad</span><div className="atal-custom-unit-options" role="group" aria-label="Unidad">
            {(mode === 'duration' ? ['días', 'semanas', 'meses'] : ['por día', 'por semana', 'por mes']).map((item) => <button type="button" key={item} className={unit === item ? 'is-selected' : ''} aria-pressed={unit === item} onClick={() => setUnit(item)}><span>{item}</span>{unit === item && <Check aria-hidden="true" />}</button>)}
          </div></div>
        </div>
        <label className="atal-custom-free"><span>O escribe una indicación libre</span><input value={freeText} onChange={(event) => setFreeText(event.target.value)} placeholder={mode === 'duration' ? 'Ej. por definir' : 'Ej. cada 10 días o según tolerancia'} /></label>
        {mode === 'duration' && <div className="atal-special-values"><button type="button" onClick={() => { onChange('Por definir'); close(); }}>Por definir</button><button type="button" onClick={() => { onChange('Sin duración estimada'); close(); }}>Sin duración estimada</button></div>}
        <button type="button" className="atal-custom-save" onClick={saveCustom}><Check /> Usar valor</button>
      </div>}
    </section></div>}
  </>;
}
