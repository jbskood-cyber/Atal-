import { CheckCircle2, Crosshair, ShieldPlus, TrendingUp } from 'lucide-react';
import type { AtalAIDraft } from '../types';

export function SuggestionBar({ text, draft, attachments, onChip }: { text: string; draft: AtalAIDraft | null; attachments: number; onChip: (text: string) => void }) {
  const missing=draft?.missingFields.join(' ').toLowerCase()??'';
  const chips = draft ? missing.includes('frecuencia') ? [
    {label:'Definir frecuencia',text:'Define la frecuencia según la información disponible y pregúntame si falta algo.',icon:Crosshair},
    {label:'Añadir precaución',text:'Añade esta precaución al borrador: ',icon:ShieldPlus},
    {label:'¿Listo para aplicar?',text:'Comprueba qué falta antes de aplicar los cambios.',icon:CheckCircle2},
  ] : [
    {label:'Sugerir progresión',text:'Sugiere una progresión conservadora usando únicamente los datos confirmados.',icon:TrendingUp},
    {label:'Ajustar enfoque',text:'Ayúdame a ajustar el enfoque clínico del borrador actual.',icon:Crosshair},
    {label:'¿Listo para aplicar?',text:'Comprueba qué falta antes de aplicar los cambios.',icon:CheckCircle2},
  ] : [
    {label:'Objetivo',text:'Objetivo funcional: ',icon:Crosshair},
    {label:'Precauciones',text:'Precauciones: ',icon:ShieldPlus},
    {label:'Frecuencia',text:'Frecuencia propuesta: ',icon:TrendingUp},
  ];
  const suggestion = draft?.followUpQuestion || (draft?.missingFields.length ? `Falta completar: ${draft.missingFields.slice(0,2).join(' y ')}.` : attachments ? 'Aclara brevemente qué contiene cada archivo.' : text.length > 120 ? 'Revisa frecuencia, precauciones y dosis.' : 'Añade motivo de consulta y objetivo funcional.');
  return <div className="atal-command-suggestions"><p>{suggestion}</p><div>{chips.slice(0,3).map(({label,text:guide,icon:Icon})=><button type="button" key={label} onClick={()=>onChip(guide)}><Icon/>{label}</button>)}</div></div>;
}
