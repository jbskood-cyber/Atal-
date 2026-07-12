'use client';

import { AlertTriangle, ArrowLeft, ChevronRight, Clock3, Dumbbell, Eye, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalLogo } from '@/src/components/atal/AtalLogo';
import { patients } from '@/src/data/atal-demo';
import { guidedDemoPlan } from '@/src/features/guided-session/demo';
import { clearSessionDraft, readSessionDraft } from '@/src/features/guided-session/storage';

export function PatientPortalPreviewScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const patient = patients.find((item) => item.id === patientId);
  if (!patient) return <main className="atal-patient-plan"><section className="atal-plan-unavailable"><AlertTriangle /><h1>Paciente no encontrado</h1><p>No pudimos abrir esta vista local.</p><button type="button" onClick={() => router.push('/patients')}>Volver a pacientes</button></section></main>;
  const stored = readSessionDraft(patientId).draft;
  const canResume = stored?.status === 'in_progress' || stored?.status === 'partial' && stored.stage !== 'summary';
  const hasCompletedSession = stored?.stage === 'summary';
  const completed = stored ? Object.values(stored.exercises).filter((record) => record.result === 'completed').length : 0;
  const restart = () => { if (window.confirm('¿Borrar el progreso local y empezar de nuevo?')) { clearSessionDraft(patientId); router.push(`/patients/${patientId}/session`); } };

  return <main className="atal-patient-plan">
    <header className="atal-patient-plan-header"><button type="button" aria-label="Volver al expediente" onClick={() => router.back()}><ArrowLeft /></button><AtalLogo /><span><Eye /> Vista del fisioterapeuta</span></header>
    <section className="atal-patient-plan-hero"><span>Hola, {patient.name.replace('Paciente Demo ', 'Paciente ')}</span><h1>Tu recuperación, paso a paso.</h1><p>Este espacio contiene únicamente tu plan y las indicaciones necesarias para realizarlo.</p></section>
    <section className="atal-patient-plan-card"><span className="atal-session-kicker">Mi plan</span><h2>{guidedDemoPlan.name}</h2><blockquote>{guidedDemoPlan.therapistMessage}</blockquote><div className="atal-patient-plan-facts"><span><Clock3 /><b>{guidedDemoPlan.estimatedDuration}</b><small>duración aproximada</small></span><span><Dumbbell /><b>{guidedDemoPlan.exercises.length} ejercicios</b><small>rutina actual</small></span><span><RotateCcw /><b>{completed}/{guidedDemoPlan.exercises.length}</b><small>progreso reciente</small></span></div><div className="atal-patient-exercise-preview"><header><h3>Ejercicios de hoy</h3><small>Puedes revisarlos antes de comenzar.</small></header>{guidedDemoPlan.exercises.map((exercise, index) => <article key={exercise.id}><span>{index + 1}</span><div><b>{exercise.name}</b><small>{exercise.region} · {exercise.sets} series · {exercise.repetitions ? `${exercise.repetitions} repeticiones` : `${exercise.seconds} segundos`}</small></div><ChevronRight /></article>)}</div><div className="atal-plan-guidance"><ShieldCheck /><div><b>Indicaciones generales</b><p>{guidedDemoPlan.generalInstructions}</p></div></div>{canResume ? <div className="atal-plan-session-actions"><button type="button" className="atal-session-primary" onClick={() => router.push(`/patients/${patientId}/session`)}><Play /> Continuar donde lo dejaste</button><button type="button" onClick={restart}>Empezar de nuevo</button></div> : <button type="button" className="atal-session-primary atal-start-session" onClick={() => { if (hasCompletedSession) clearSessionDraft(patientId); router.push(`/patients/${patientId}/session`); }}><Play /> {hasCompletedSession ? 'Iniciar nueva sesión' : 'Iniciar sesión'}</button>}<small className="atal-local-save-copy">Demostración local: ningún dato se envía ni se comparte.</small></section>
  </main>;
}
