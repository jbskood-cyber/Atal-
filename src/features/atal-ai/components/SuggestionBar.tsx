import { Lightbulb } from 'lucide-react';
import type { AtalAIDraft } from '../types';

const chips = [{ label: 'Dolor', text: 'Dolor actual: ' }, { label: 'Objetivo', text: 'Objetivo funcional: ' }, { label: 'Limitaciones', text: 'Limitaciones: ' }, { label: 'Precauciones', text: 'Precauciones: ' }, { label: 'Frecuencia', text: 'Frecuencia propuesta: ' }];

export function SuggestionBar({ text, draft, attachments, onChip }: { text: string; draft: AtalAIDraft | null; attachments: number; onChip: (text: string) => void }) {
  const suggestion = draft?.followUpQuestion || (draft?.missingFields.length ? `Falta completar: ${draft.missingFields.slice(0,2).join(' y ')}.` : attachments ? 'Añade una aclaración breve sobre lo que contiene cada archivo.' : text.length > 120 ? 'Revisa que hayas indicado frecuencia, precauciones y dosis.' : 'Agrega edad, motivo de consulta y objetivo funcional.');
  return <div className="atal-ai-suggestions"><p><Lightbulb /> {suggestion}</p><div>{chips.slice(0,3).map((chip) => <button type="button" key={chip.label} onClick={() => onChip(chip.text)}>+ {chip.label}</button>)}</div></div>;
}
