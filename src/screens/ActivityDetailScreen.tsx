'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Check, ClipboardList, HeartPulse, MessageSquareText, Save, Target } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { reviewSession, useAtalStore } from '@/src/data/atalStore';
import { sessionExerciseProgress, sessionNeedsAttention } from '@/src/domain/clinicalMetrics';
import { sessionPlanSnapshot } from '@/src/features/guided-session/sessionRepository';
import { useUnsavedChangesGuard } from '@/src/hooks/useUnsavedChangesGuard';

export function ActivityDetailScreen({ patientId: sessionOrPatientId }: { patientId: string }) {
  const router = useRouter();
  const state = useAtalStore((store) => ({ sessions: store.sessions, patients: store.patients, plans: store.plans }));
  const session = state.sessions.find((item) => item.id === sessionOrPatientId) ?? state.sessions.find((item) => item.patientId === sessionOrPatientId);
  const patient = state.patients.find((item) => item.id === session?.patientId);
  const plan = state.plans.find((item) => item.id === session?.planId);
  const snapshot = session ? sessionPlanSnapshot(session) : null;
  const [value, setValue] = useState(session?.clinicalObservation ?? '');
  const [message, setMessage] = useState('');
  const dirty = Boolean(session && value !== session.clinicalObservation);
  const guard = useUnsavedChangesGuard(dirty);
  useEffect(() => setValue(session?.clinicalObservation ?? ''), [session?.id, session?.updatedAt]);

  const exerciseRows = useMemo(() => {
    if (!session) return [];
    return Object.entries(session.exercises).map(([exerciseId, record], index) => ({
      exerciseId,
      record,
      exercise: snapshot?.exercises.find((item) => item.id === exerciseId),
      index,
    }));
  }, [session, snapshot]);

  if (!session || !patient) return <AtalShell><main className="atal-content atal-flow-page"><div className="atal-panel-placeholder"><ClipboardList /><h1>Reporte no encontrado</h1><p>Completa una sesión para generar un reporte real.</p><button type="button" onClick={() => router.push('/activity')}>Volver</button></div></main></AtalShell>;

  const progress = sessionExerciseProgress(session);
  const attention = sessionNeedsAttention(session);
  const save = () => {
    try {
      reviewSession(session.id, value.slice(0, 2000));
      setMessage('Observación guardada y reporte marcado como revisado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar la observación.');
    }
  };
  const planName = plan?.title ?? snapshot?.name ?? 'Plan histórico';

  return <AtalShell><main className="atal-content atal-flow-page">
    <div className="atal-flow-topbar"><button type="button" onClick={() => guard.requestNavigation(() => router.back())}><ArrowLeft /></button><span>Reporte clínico</span><i /></div>
    <div className="atal-report-person"><span className="atal-report-avatar"><Avatar name={patient.name} /></span><span><h1>{patient.name}</h1><small>{new Date(session.completedAt).toLocaleString('es-MX')} · {session.status === 'completed' ? 'Completada' : 'Parcial'}</small></span><i className={attention ? 'is-attention' : ''} /></div>
    {plan ? <button type="button" className="atal-report-plan" onClick={() => router.push(`/plans/${plan.id}`)}><ClipboardList /><span>{planName}</span></button> : <div className="atal-report-plan"><ClipboardList /><span>{planName}</span></div>}
    <section className="atal-report-summary"><h2>Resumen real de la sesión</h2><Metric icon={<Check />} label="Ejercicios completados" value={`${progress.completed}/${progress.total}`} /><Metric icon={<HeartPulse />} label="Dolor" value={`${session.startPain} → ${session.endPain}/10`} /><Metric icon={<Target />} label="Series completadas" value={`${progress.completedSets}/${progress.totalSets}`} /><Metric icon={<Target />} label="Duración" value={`${session.durationMinutes} min`} /></section>
    <section className="atal-report-summary"><h2>Detalle por ejercicio</h2>{exerciseRows.map(({ exerciseId, record, exercise, index }) => {
      const completedSets = record.sets.filter((set) => set.completed).length;
      const result = record.result === 'completed' ? 'Completado' : record.result === 'partial' ? 'Parcial' : 'Omitido';
      return <Metric key={exerciseId} icon={<Check />} label={exercise?.name ?? `Ejercicio ${index + 1}`} value={`${result} · ${completedSets}/${record.sets.length} series`} />;
    })}{!exerciseRows.length && <p>Sin detalle de ejercicios disponible.</p>}</section>
    <section className="atal-report-comment"><h2>Experiencia del paciente</h2><blockquote>“{session.comment || session.startComment || 'Sin comentario del paciente.'}”</blockquote><p>Síntomas: {session.symptoms.join(', ')}</p><p>Más fácil: {session.easiest || 'Sin respuesta'}</p><p>Más difícil: {session.hardest || 'Sin respuesta'}</p><p>Molestias: {session.discomfort || 'Sin molestias adicionales'}</p></section>
    <section className="atal-observations"><h2>Observaciones del fisioterapeuta</h2><label><MessageSquareText /><textarea maxLength={2000} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Escribe una observación clínica…" /></label><small>{value.length}/2000</small><button type="button" disabled={!dirty && Boolean(session.reviewedAt)} onClick={save}>{session.reviewedAt ? <Check /> : <Save />}{session.reviewedAt ? 'Actualizar observación' : 'Guardar y marcar revisado'}</button>{message && <p role="status">{message}</p>}</section>
    {guard.hasPendingNavigation && <div className="atal-session-dialog" role="dialog" aria-modal="true"><section><AlertTriangle /><h2>¿Salir sin guardar?</h2><p>La observación clínica escrita todavía no se ha guardado.</p><button type="button" onClick={guard.cancelDiscard}>Continuar editando</button><button type="button" className="atal-session-primary" onClick={guard.confirmDiscard}>Descartar y salir</button></section></div>}
  </main></AtalShell>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="atal-report-metric"><span>{icon}</span><span><b>{label}</b><small>Sesión registrada</small></span><strong>{value}</strong></div>;
}
