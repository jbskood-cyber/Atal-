'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ChevronRight, Clock3, Dumbbell, Eye, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalLogo } from '@/src/components/atal/AtalLogo';
import { patients } from '@/src/data/atal-demo';
import { ExercisePreviewDialog } from '@/src/features/guided-session/ExercisePreviewDialog';
import { resolvePatientPlan } from '@/src/features/guided-session/planResolver';
import { clearSessionDraft, readSessionDraft } from '@/src/features/guided-session/storage';
import type { GuidedExercise } from '@/src/features/guided-session/types';

export function PatientPortalPreviewScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const patient = patients.find((item) => item.id === patientId);
  const plan = useMemo(() => resolvePatientPlan(patientId), [patientId]);
  const [preview, setPreview] = useState<GuidedExercise | null>(null);
  if (!patient) return <main className="atal-patient-plan"><section className="atal-plan-unavailable"><AlertTriangle /><h1>Paciente no encontrado</h1><p>No pudimos abrir esta vista local.</p><button type="button" onClick={() => router.push('/patients')}>Volver a pacientes</button></section></main>;
  const stored = readSessionDraft(patientId, plan.id).draft;
  const canResume = stored?.status === 'in_progress' || (stored?.status === 'partial' && stored.stage !== 'summary');
  const hasCompletedSession = stored?.stage === 'summary';
  const completed = stored ? Object.values(stored.exercises).filter((record) => record.result === 'completed').length : 0;
  const restart = () => { if (window.confirm('¿Borrar el progreso local y empezar de nuevo?')) { clearSessionDraft(patientId, plan.id); router.push(`/patients/${patientId}/session`); } };

  return <main className="atal-patient-plan">
    <header className="atal-patient-plan-header"><button type="button" aria-label="Volver al expediente" onClick={() => router.back()}><ArrowLeft /></button><AtalLogo /><span><Eye /> Vista del fisioterapeuta</span></header>
    <section className="atal-patient-plan-hero"><span>Hola, {patient.name.replace('Paciente Demo ', 'Paciente ')}</span><h1>Tu recuperación, paso a paso.</h1><p>Este espacio contiene únicamente tu plan y las indicaciones necesarias para realizarlo.</p></section>
    <section className="atal-patient-plan-card"><span className="atal-session-kicker">Mi plan</span><h2>{plan.name}</h2><blockquote>{plan.therapistMessage}</blockquote><div className="atal-patient-plan-facts"><span><Clock3 /><b>{plan.estimatedDuration}</b><small>duración aproximada</small></span><span><Dumbbell /><b>{plan.exercises.length} ejercicios</b><small>rutina actual</small></span><span><RotateCcw /><b>{completed}/{plan.exercises.length}</b><small>progreso reciente</small></span></div><div className="atal-patient-exercise-preview"><header><h3>Ejercicios de hoy</h3><small>Puedes revisarlos antes de comenzar.</small></header>{plan.exercises.length ? plan.exercises.map((exercise, index) => <button type="button" key={exercise.id} onClick={() => setPreview(exercise)}><span>{index + 1}</span><div><b>{exercise.name}</b><small>{exercise.region} · {exercise.sets} series · {exercise.repetitions ? `${exercise.repetitions} repeticiones` : `${exercise.seconds} segundos`}</small></div><ChevronRight /></button>) : <div className="atal-plan-empty-note"><AlertTriangle /><span><b>Plan sin ejercicios</b><small>El fisioterapeuta todavía no ha añadido ejercicios.</small></span></div>}</div><div className="atal-plan-guidance"><ShieldCheck /><div><b>Indicaciones generales</b><p>{plan.generalInstructions}</p></div></div>{canResume ? <div className="atal-plan-session-actions"><button type="button" className="atal-session-primary" onClick={() => router.push(`/patients/${patientId}/session`)}><Play /> Continuar donde lo dejaste</button><button type="button" onClick={restart}>Empezar de nuevo</button></div> : <button type="button" className="atal-session-primary atal-start-session" disabled={!plan.exercises.length} onClick={() => { if (hasCompletedSession) clearSessionDraft(patientId, plan.id); router.push(`/patients/${patientId}/session`); }}><Play /> {hasCompletedSession ? 'Iniciar nueva sesión' : 'Iniciar sesión'}</button>}<small className="atal-local-save-copy">Demostración local: ningún dato se envía ni se comparte.</small></section>
    {preview && <ExercisePreviewDialog exercise={preview} onClose={() => setPreview(null)} />}
  </main>;
}
