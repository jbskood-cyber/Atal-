import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getPatientById } from '@/src/data/localPatients';
import { useAtalStore } from '@/src/data/atalStore';
import { ActiveExercise } from './ActiveExercise';
import { PatientSessionFrame } from './PatientSessionFrame';
import { resolvePatientPlan } from './planResolver';
import { SessionClose } from './SessionClose';
import { SessionPreparation } from './SessionPreparation';
import { SessionSummary } from './SessionSummary';
import { recordClinicalSessionStarted, saveCompletedClinicalSession } from './sessionRepository';
import { clearSessionDraft, createSessionDraft, readSessionDraft, writeSessionDraft } from './storage';
import type { GuidedSessionDraft } from './types';

export function GuidedSessionFlow({ patientId }: { patientId: string }) {
  const router = useRouter();
  const revision = useAtalStore((state) => state.updatedAt);
  const patient = useMemo(() => getPatientById(patientId), [patientId, revision]);
  const livePlan = useMemo(() => resolvePatientPlan(patientId), [patientId, revision]);
  const restored = useMemo(() => patient ? readSessionDraft(patientId, livePlan) : { draft: null, error: false }, [patient, patientId, livePlan]);
  const [draft, setDraft] = useState<GuidedSessionDraft>(() => restored.draft ?? createSessionDraft(patientId, livePlan));
  const [resumeGate, setResumeGate] = useState(Boolean(restored.draft && restored.draft.stage !== 'prepare'));
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const plan = draft.planSnapshot ?? livePlan;
  const currentPlanStatus = useAtalStore((state) => state.plans.find((item) => item.id === draft.planId)?.status ?? (draft.planId === livePlan.id ? livePlan.status : 'none'));

  useEffect(() => {
    if (draft.startedAt && draft.stage !== 'summary') writeSessionDraft(draft);
  }, [draft]);

  if (!patient) return <PatientSessionFrame label="Plan no disponible" progress={0} onExit={() => router.push('/patients')}><StateCard icon={<AlertTriangle />} title="Paciente no encontrado" text="No pudimos abrir esta sesión. Regresa al expediente y vuelve a intentarlo." action="Volver" onAction={() => router.push('/patients')} /></PatientSessionFrame>;
  if (patient.status === 'archived') return <PatientSessionFrame label="Paciente archivado" progress={0} onExit={() => router.push(`/patients/${patientId}`)}><StateCard icon={<AlertTriangle />} title="Sesión no disponible" text="El paciente está archivado. Restáuralo desde su expediente antes de iniciar o continuar sesiones." action="Volver al expediente" onAction={() => router.push(`/patients/${patientId}`)} /></PatientSessionFrame>;
  if (currentPlanStatus !== 'active' && draft.stage !== 'summary') {
    const paused = currentPlanStatus === 'paused';
    return <PatientSessionFrame label={paused ? 'Plan pausado' : 'Plan no disponible'} progress={0} onExit={() => router.push(`/patients/${patientId}/portal-preview`)}><StateCard icon={<AlertTriangle />} title={paused ? 'Plan pausado' : 'No se puede continuar esta sesión'} text={paused ? 'Este plan no permite continuar hasta que el fisioterapeuta lo reactive.' : 'El plan de esta sesión fue completado, archivado o eliminado. El progreso permanece guardado para revisión.'} action="Volver al plan" onAction={() => router.push(`/patients/${patientId}/portal-preview`)} /></PatientSessionFrame>;
  }
  if (!plan.exercises.length) return <PatientSessionFrame label="Plan sin ejercicios" progress={0} onExit={() => router.push(`/patients/${patientId}/portal-preview`)}><StateCard icon={<AlertTriangle />} title="Plan sin ejercicios" text="Tu fisioterapeuta todavía no ha añadido ejercicios a este plan." action="Volver al plan" onAction={() => router.push(`/patients/${patientId}/portal-preview`)} /></PatientSessionFrame>;

  const currentIndex = Math.min(Math.max(0, draft.currentExerciseIndex), plan.exercises.length - 1);
  const exercise = plan.exercises[currentIndex];
  const safeRecord = exercise ? draft.exercises[exercise.id] ?? createSessionDraft(patientId, plan).exercises[exercise.id] : undefined;
  const completedCount = Object.values(draft.exercises).filter((record) => record.result).length;
  const progress = draft.stage === 'prepare' ? 4 : draft.stage === 'exercise' ? ((currentIndex + 0.2) / plan.exercises.length) * 80 + 8 : draft.stage === 'close' ? 92 : 100;
  const restart = () => {
    clearSessionDraft(patientId, draft.planId);
    setDraft(createSessionDraft(patientId, livePlan));
    setResumeGate(false);
    setConfirmRestart(false);
  };
  const finishEarly = () => {
    setDraft((current) => ({ ...current, status: 'partial', stage: 'close' }));
    setConfirmFinish(false);
  };
  const finish = () => {
    const allComplete = Object.values(draft.exercises).every((record) => record.result === 'completed');
    const next: GuidedSessionDraft = { ...draft, planSnapshot: structuredClone(plan), status: allComplete ? 'completed' : 'partial', stage: 'summary', completedAt: new Date().toISOString() };
    saveCompletedClinicalSession(patientId, draft.planId, next);
    clearSessionDraft(patientId, draft.planId);
    setDraft(next);
  };

  if (restored.error && !draft.startedAt) return <PatientSessionFrame label="Recuperación de sesión" progress={0} onExit={() => router.push(`/patients/${patientId}/portal-preview`)}><StateCard icon={<AlertTriangle />} title="No pudimos recuperar la sesión" text="Puedes comenzar una sesión nueva sin afectar tu plan." action="Empezar de nuevo" onAction={restart} /></PatientSessionFrame>;

  return <PatientSessionFrame label={draft.stage === 'exercise' ? `Ejercicio ${currentIndex + 1} de ${plan.exercises.length}` : draft.stage === 'summary' ? 'Resumen' : draft.stage === 'close' ? 'Cierre' : 'Preparación'} progress={progress} onExit={() => router.push(`/patients/${patientId}/portal-preview`)}>
    {resumeGate ? <section className="atal-session-card atal-resume-card"><RotateCcw /><span className="atal-session-kicker">Sesión sin terminar</span><h1>Continúa donde lo dejaste</h1><p>Conservamos la versión del plan, el ejercicio actual, tus series, valores y comentarios.</p><div><button type="button" className="atal-session-primary" onClick={() => setResumeGate(false)}>Continuar sesión</button><button type="button" onClick={() => setConfirmRestart(true)}>Empezar de nuevo</button></div></section> : <>
      {draft.stage === 'prepare' && <SessionPreparation plan={plan} draft={draft} onChange={setDraft} onStart={() => setDraft((current) => { const startedAt = current.startedAt ?? new Date().toISOString(); recordClinicalSessionStarted(patientId, current.planId, startedAt); return { ...current, planSnapshot: structuredClone(plan), stage: 'exercise', status: 'in_progress', startedAt }; })} />}
      {draft.stage === 'exercise' && exercise && safeRecord && <ActiveExercise exercise={exercise} record={safeRecord} index={currentIndex} total={plan.exercises.length} onChange={(record) => setDraft((current) => ({ ...current, currentExerciseIndex: currentIndex, exercises: { ...current.exercises, [exercise.id]: record } }))} onPrevious={() => setDraft((current) => ({ ...current, currentExerciseIndex: Math.max(0, currentIndex - 1) }))} onNext={() => setDraft((current) => currentIndex === plan.exercises.length - 1 ? { ...current, currentExerciseIndex: currentIndex, stage: 'close' } : { ...current, currentExerciseIndex: currentIndex + 1 })} onFinishEarly={() => setConfirmFinish(true)} />}
      {draft.stage === 'close' && <SessionClose plan={plan} draft={draft} onChange={setDraft} onFinish={finish} />}
      {draft.stage === 'summary' && <SessionSummary plan={plan} draft={draft} onPlan={() => router.push(`/patients/${patientId}/portal-preview`)} onRestart={() => setConfirmRestart(true)} />}
    </>}
    {confirmFinish && <ConfirmDialog title="¿Terminar la sesión?" text={`Todavía quedan ${Math.max(0, plan.exercises.length - completedCount)} ejercicios pendientes. La sesión se guardará como parcial.`} confirm="Terminar de todas formas" cancel="Continuar sesión" onConfirm={finishEarly} onCancel={() => setConfirmFinish(false)} />}
    {confirmRestart && <ConfirmDialog title="¿Empezar de nuevo?" text="Se borrará el progreso de esta sesión." confirm="Borrar y reiniciar" cancel="Conservar progreso" onConfirm={restart} onCancel={() => setConfirmRestart(false)} />}
  </PatientSessionFrame>;
}

function ConfirmDialog({ title, text, confirm, cancel, onConfirm, onCancel }: { title: string; text: string; confirm: string; cancel: string; onConfirm: () => void; onCancel: () => void }) {
  return <div className="atal-session-dialog" role="dialog" aria-modal="true"><section><AlertTriangle /><h2>{title}</h2><p>{text}</p><button type="button" className="atal-session-primary" onClick={onConfirm}>{confirm}</button><button type="button" onClick={onCancel}>{cancel}</button></section></div>;
}

function StateCard({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action: string; onAction: () => void }) {
  return <section className="atal-session-card atal-state-card"><span>{icon}</span><h1>{title}</h1><p>{text}</p><button type="button" className="atal-session-primary" onClick={onAction}>{action}</button></section>;
}
