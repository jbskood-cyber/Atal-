'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ChevronRight, Clock3, Dumbbell, Eye, FileDown, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalLogo } from '@/src/components/atal/AtalLogo';
import { getPatientById } from '@/src/data/localPatients';
import { ExercisePreviewDialog } from '@/src/features/guided-session/ExercisePreviewDialog';
import { resolvePatientPlan } from '@/src/features/guided-session/planResolver';
import { clearSessionDraft, readSessionDraft } from '@/src/features/guided-session/storage';
import type { GuidedExercise } from '@/src/features/guided-session/types';
import { useAtalStore } from '@/src/data/atalStore';

export function PatientPortalPreviewScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const store = useAtalStore((state) => ({
    revision: state.updatedAt,
    sessions: state.sessions.filter((item) => item.patientId === patientId),
    plans: state.plans.filter((item) => item.patientId === patientId),
    hidePatientName: state.settings.clinicalPrivacy,
  }));
  const patient = useMemo(() => getPatientById(patientId), [patientId, store.revision]);
  const livePlan = useMemo(() => resolvePatientPlan(patientId), [patientId, store.revision]);
  const [preview, setPreview] = useState<GuidedExercise | null>(null);
  const [restartOpen, setRestartOpen] = useState(false);
  const restartTriggerRef = useRef<HTMLButtonElement>(null);
  const restartCancelRef = useRef<HTMLButtonElement>(null);
  const closeRestart = () => {
    setRestartOpen(false);
    window.setTimeout(() => restartTriggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!restartOpen) return;
    restartCancelRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRestart();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [restartOpen]);

  if (!patient) {
    return <main className="atal-patient-plan"><section className="atal-plan-unavailable"><AlertTriangle /><h1>Paciente no encontrado</h1><p>No pudimos abrir la vista del paciente.</p><button type="button" onClick={() => router.push('/patients')}>Volver a pacientes</button></section></main>;
  }
  if (patient.status === 'archived') {
    return <main className="atal-patient-plan"><section className="atal-plan-unavailable"><AlertTriangle /><h1>Paciente archivado</h1><p>Restaura al paciente desde su expediente antes de abrir su plan o iniciar sesiones.</p><button type="button" onClick={() => router.push(`/patients/${patientId}`)}>Volver al expediente</button></section></main>;
  }

  const stored = readSessionDraft(patientId, livePlan).draft;
  const storedPlanStatus = stored ? store.plans.find((item) => item.id === stored.planId)?.status ?? 'none' : 'none';
  const storedCanResume = Boolean(stored && (stored.status === 'in_progress' || (stored.status === 'partial' && stored.stage !== 'summary')));
  const canResume = storedCanResume && storedPlanStatus === 'active';
  const plan = livePlan;
  const hasCompletedSession = Boolean(stored?.stage === 'summary' && stored.planId === plan.id);
  const latestSession = store.sessions.find((item) => item.planId === plan.id);
  const completed = canResume && stored
    ? Object.values(stored.exercises).filter((record) => record.result === 'completed').length
    : latestSession
      ? Object.values(latestSession.exercises).filter((record) => record.result === 'completed').length
      : 0;
  const displayName = store.hidePatientName ? 'Paciente' : patient.name.replace('Paciente Demo ', 'Paciente ');
  const restart = () => {
    if (stored) clearSessionDraft(patientId, stored.planId);
    setRestartOpen(false);
    router.push(`/patients/${patientId}/session`);
  };
  const startSession = () => {
    if (stored && (!canResume || hasCompletedSession)) clearSessionDraft(patientId, stored.planId);
    router.push(`/patients/${patientId}/session`);
  };

  return <main className="atal-patient-plan">
    <header className="atal-patient-plan-header"><button type="button" aria-label="Volver al expediente" onClick={() => router.back()}><ArrowLeft /></button><AtalLogo /><span><Eye /> Vista del fisioterapeuta</span></header>
    <section className="atal-patient-plan-hero"><span>Hola, {displayName}</span><h1>Tu recuperación, paso a paso.</h1><p>Aquí encontrarás tu plan, tus ejercicios y las indicaciones necesarias para realizarlos.</p></section>
    <section className="atal-patient-plan-card">
      <span className="atal-session-kicker">Tu plan actual</span>
      <h2>{plan.name}</h2>
      <blockquote>{plan.therapistMessage}</blockquote>
      {plan.status === 'paused' && <div className="atal-plan-empty-note"><AlertTriangle /><span><b>Plan pausado</b><small>Tu fisioterapeuta indicará cuándo puedes retomarlo.</small></span></div>}
      <div className="atal-patient-plan-facts"><span><Clock3 /><b>{plan.estimatedDuration}</b><small>duración</small></span><span><Dumbbell /><b>{plan.exercises.length} ejercicios</b><small>rutina actual</small></span><span><RotateCcw /><b>{completed}/{plan.exercises.length}</b><small>progreso</small></span></div>
      <div className="atal-patient-exercise-preview"><header><h3>Ejercicios de hoy</h3><small>Revísalos antes de comenzar.</small></header>{plan.exercises.length ? plan.exercises.map((exercise, index) => <button type="button" key={exercise.id} onClick={() => setPreview(exercise)}><span>{index + 1}</span><div><b>{exercise.name}</b><small>{exercise.region} · {exercise.sets} series · {exercise.repetitions ? `${exercise.repetitions} repeticiones` : `${exercise.seconds} segundos`}</small></div><ChevronRight /></button>) : <div className="atal-plan-empty-note"><AlertTriangle /><span><b>Sin rutina activa</b><small>Tu fisioterapeuta todavía no ha activado ejercicios.</small></span></div>}</div>
      <div className="atal-plan-guidance"><ShieldCheck /><div><b>Indicaciones generales</b><p>{plan.generalInstructions}</p></div></div>
      <div className="atal-plan-session-actions">
        {canResume ? <><button type="button" className="atal-session-primary" onClick={() => router.push(`/patients/${patientId}/session`)}><Play /> Continuar donde lo dejaste</button><button ref={restartTriggerRef} type="button" onClick={() => setRestartOpen(true)}>Empezar de nuevo</button></> : <button type="button" className="atal-session-primary atal-start-session" disabled={!plan.exercises.length || plan.status !== 'active'} onClick={startSession}><Play /> {plan.status === 'paused' ? 'Plan pausado' : hasCompletedSession ? 'Iniciar nueva sesión' : 'Iniciar sesión'}</button>}
        {plan.status !== 'none' && <button type="button" onClick={() => router.push(`/plans/${plan.id}/delivery`)}><FileDown /> Ver y descargar plan</button>}
      </div>
      <small className="atal-local-save-copy">Tu progreso se guarda automáticamente y conserva la versión del plan con la que comenzaste.</small>
    </section>
    {preview && <ExercisePreviewDialog exercise={preview} onClose={() => setPreview(null)} />}
    {restartOpen && <div className="atal-session-dialog" role="dialog" aria-modal="true" aria-labelledby="restart-title" onMouseDown={closeRestart}><section onMouseDown={(event) => event.stopPropagation()}><RotateCcw /><h2 id="restart-title">¿Empezar una sesión nueva?</h2><p>Se eliminará el progreso de esta sesión. Tu plan y tus ejercicios no cambiarán.</p><button ref={restartCancelRef} type="button" onClick={closeRestart}>Conservar progreso</button><button type="button" className="atal-session-primary" onClick={restart}>Borrar y empezar de nuevo</button></section></div>}
  </main>;
}
