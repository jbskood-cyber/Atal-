'use client';

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

export function QuickCreateModal({
  title,
  label,
  placeholder,
  onClose,
  onCreate,
}: {
  title: string;
  label: string;
  placeholder: string;
  onClose: () => void;
  onCreate: (value: string) => void;
}) {
  const [value, setValue] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = value.trim();
    if (!clean) return;
    onCreate(clean);
    onClose();
  };

  return (
    <div className="atal-modal-layer" role="presentation" onMouseDown={onClose}>
      <form className="atal-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="atal-modal__header"><h2>{title}</h2><button type="button" aria-label="Cerrar" onClick={onClose}><X size={22} /></button></div>
        <label><span>{label}</span><input autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} /></label>
        <div className="atal-modal__actions"><button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="is-primary">Crear</button></div>
      </form>
    </div>
  );
}
