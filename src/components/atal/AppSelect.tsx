import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

type AppSelectProps = {
  label: string;
  value: string;
  options: string[];
  icon?: ReactNode;
  trigger?: ReactNode;
  searchable?: boolean;
  getOptionDetail?: (option: string) => string | undefined;
  onChange: (value: string) => void;
};

export function AppSelect({ label, value, options, icon, trigger, searchable = false, getOptionDetail, onChange }: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    setQuery('');
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-MX');
    if (!normalized) return options;
    return options.filter((option) => `${option} ${getOptionDetail?.(option) ?? ''}`.toLocaleLowerCase('es-MX').includes(normalized));
  }, [getOptionDetail, options, query]);

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

  return <>
    <button
      ref={triggerRef}
      type="button"
      className={`atal-app-select${trigger ? ' atal-app-select--rich' : ''}`}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => setOpen(true)}
    >
      {icon}
      {trigger ?? <span>{value}</span>}
      <ChevronDown />
    </button>
    {open && <div className="atal-select-overlay" onMouseDown={close}>
      <section role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onMouseDown={(event) => event.stopPropagation()}>
        <header><h2 id={`${id}-title`}>{label}</h2><button ref={closeRef} type="button" onClick={close} aria-label="Cerrar selector"><X /></button></header>
        {searchable && <label className="atal-select-search"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar paciente…" /></label>}
        <div id={id} role="listbox" aria-label={label}>
          {filteredOptions.map((option) => {
            const selected = option === value;
            const detail = getOptionDetail?.(option);
            return <button type="button" role="option" aria-selected={selected} key={option} className={selected ? 'is-selected' : ''} onClick={() => { onChange(option); close(); }}>
              <span className="atal-select-option-copy"><b>{option}</b>{detail && <small>{detail}</small>}</span>
              {selected && <Check />}
            </button>;
          })}
          {!filteredOptions.length && <p className="atal-select-empty">No encontramos pacientes con esa búsqueda.</p>}
        </div>
      </section>
    </div>}
  </>;
}
