import { CheckCircle2, Clock3, RotateCcw } from 'lucide-react';
import type { GuidedPlan, GuidedSessionDraft } from './types';

export function SessionSummary({ plan, draft, onPlan, onRestart }: { plan: GuidedPlan; draft: GuidedSessionDraft; onPlan: () => void; onRestart: () => void }) {
  const records = Object.values(draft.exercises);
  const completed = records.filter((record) => record.result === 'completed').length;
  const partial = records.filter((record) => record.result === 'partial').length;
  const skipped = records.filter((record) => record.result === 'skipped' || !record.result).length;
  const duration = draft.startedAt && draft.completedAt ? Math.max(1, Math.round((new Date(draft.completedAt).getTime() - new Date(draft.startedAt).getTime()) / 60000)) : 0;
  return <section className="atal-session-card atal-session-summary"><span className="atal-summary-check"><CheckCircle2 /></span><span className="atal-session-kicker">Guardado localmente</span><h1>{draft.status === 'completed' ? 'Sesión completada' : 'Sesión guardada como parcial'}</h1><p>{draft.status === 'completed' ? 'Buen trabajo. Avanzaste a tu ritmo y registraste cómo te sentiste.' : 'Tu progreso quedó guardado en este dispositivo.'}</p><div className="atal-summary-grid"><article><strong>{completed}</strong><small>completados</small></article><article><strong>{partial}</strong><small>parciales</small></article><article><strong>{skipped}</strong><small>omitidos</small></article></div><div className="atal-summary-details"><span><b>Plan</b><strong>{plan.name}</strong></span><span><b>Duración</b><strong><Clock3 /> {duration} min</strong></span><span><b>Dolor</b><strong>{draft.start.pain}/10 → {draft.end.pain}/10</strong></span><span><b>Comentario</b><strong>{draft.end.comment || draft.start.comment || 'Sin comentario'}</strong></span></div><div className="atal-summary-actions"><button type="button" className="atal-session-primary" onClick={onPlan}>Volver a mi plan</button><button type="button" onClick={onRestart}><RotateCcw /> Iniciar nueva sesión</button></div></section>;
}
