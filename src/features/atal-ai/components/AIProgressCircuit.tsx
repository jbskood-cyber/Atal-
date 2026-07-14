import { useEffect, useState } from 'react';
import { AlertTriangle, Check, LoaderCircle } from 'lucide-react';
import type { AtalAIDraft, AtalAIStatus } from '../types';

const stages = [['input','Entrada'],['patient','Paciente'],['record','Expediente'],['plan','Plan'],['exercises','Ejercicios'],['apply','Aplicar']] as const;

export function AIProgressCircuit({ status, draft, onReview }: { status: AtalAIStatus; draft: AtalAIDraft | null; onReview: (stage: string) => void }) {
  const processing = status === 'processing';
  const [phase, setPhase] = useState(1);
  useEffect(() => {
    if (!processing) { setPhase(1); return; }
    const timer = window.setInterval(() => setPhase((current) => current >= 4 ? 1 : current + 1), 900);
    return () => window.clearInterval(timer);
  }, [processing]);
  const available = { input: true, patient: Boolean(draft && draft.intent !== 'create_exercise'), record: Boolean(draft && ['create_patient_plan','update_patient_record'].includes(draft.intent)), plan: Boolean(draft && ['create_patient_plan','create_plan_for_existing_patient','update_existing_plan'].includes(draft.intent)), exercises: Boolean(draft?.exercises.length), apply: status === 'saved' };
  const review = Boolean(draft?.missingFields.length || draft?.uncertainFields.length || draft?.contradictions.length);
  return <div className="atal-ai-circuit" aria-label="Progreso del borrador">{stages.map(([id,label], index) => {
    const complete = available[id]; const current = processing && index === phase;
    return <button type="button" key={id} disabled={!complete || id === 'input'} onClick={() => onReview(id)} className={`${complete ? 'is-complete' : ''}${current ? ' is-current' : ''}${review && complete && id !== 'input' ? ' is-review' : ''}`}>{current ? <LoaderCircle /> : complete ? <Check /> : review && id !== 'input' ? <AlertTriangle /> : <i />}<span>{label}</span></button>;
  })}</div>;
}
