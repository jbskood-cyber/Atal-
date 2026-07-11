'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Check, ChevronRight, Plus, Save, SlidersHorizontal, Target } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { ExerciseSelector } from '@/src/components/atal/ExerciseSelector';
import { exercises, plans } from '@/src/data/atal-demo';

type PlanTab = 'summary' | 'exercises' | 'progress' | 'review';

export function PlanDetailScreen({ planId }: { planId: string }) {
  const router = useRouter();
  const base = plans.find((item) => item.id === planId) ?? plans[0];
  const [tab, setTab] = useState<PlanTab>('exercises');
  const [selecting, setSelecting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState(base.title);
  const [patient, setPatient] = useState(base.patient);
  const [duration, setDuration] = useState(base.duration);
  const [frequency, setFrequency] = useState(base.frequency);
  const [exerciseIds, setExerciseIds] = useState(['e01', 'e02', 'e03', 'e04', 'e05', 'e06']);

  useEffect(() => {
    if (planId !== 'pl-new') return;
    const raw = window.sessionStorage.getItem('atal:new-plan');
    if (!raw) return;
    const draft = JSON.parse(raw) as { title: string; patient: string; duration: string; frequency: string; exerciseIds: string[] };
    setTitle(draft.title); setPatient(draft.patient); setDuration(draft.duration); setFrequency(draft.frequency); setExerciseIds(draft.exerciseIds);
  }, [planId]);

  const move = (index: number, direction: -1 | 1) => setExerciseIds((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 2200); };

  return <AtalShell>{selecting ? <main className="atal-content atal-flow-page"><ExerciseSelector initialIds={exerciseIds} onBack={() => setSelecting(false)} onConfirm={(ids) => { setExerciseIds(ids); setSelecting(false); }} /></main> : <main className="atal-content atal-flow-page atal-plan-detail">
    <div className="atal-flow-topbar"><button type="button" onClick={() => router.push('/plans')}><ArrowLeft /></button><span>Editar plan</span><button type="button">•••</button></div>
    <section className="atal-plan-identity"><Avatar name={patient} /><div><h1>{title}</h1><b>{patient}</b><small>Plan clínico demostrativo</small></div></section>
    <nav className="atal-tabbar">{([['summary','Resumen'],['exercises','Ejercicios'],['progress','Progreso'],['review','Revisión']] as const).map(([value,label]) => <button type="button" key={value} className={tab === value ? 'is-active' : ''} onClick={() => setTab(value)}>{label}</button>)}</nav>
    {tab === 'exercises' && <div className="atal-plan-editor"><div className="atal-plan-facts"><span><small>Duración</small><b>{duration}</b></span><span><small>Frecuencia</small><b>{frequency}</b></span></div><div className="atal-section-title"><h2>Ejercicios</h2><button type="button" onClick={() => setSelecting(true)}><Plus /> Agregar ejercicio</button></div><div className="atal-plan-exercises">{exerciseIds.map((id,index) => { const exercise=exercises.find((item)=>item.id===id); if(!exercise) return null; return <div key={id}><img src={exercise.image} alt="" /><span><b>{exercise.name}</b><small>3 series　•　12 reps</small></span><div><button type="button" onClick={() => move(index,-1)} aria-label="Subir"><ArrowUp /></button><button type="button" onClick={() => move(index,1)} aria-label="Bajar"><ArrowDown /></button></div></div>; })}</div><section className="atal-plan-settings"><h2>Ajustes del plan</h2><button type="button"><span><SlidersHorizontal /></span><b>Progresión</b><em>Lineal</em><ChevronRight /></button><button type="button"><span><Target /></span><b>Criterio de reporte</b><em>Dolor ≤ 3</em><ChevronRight /></button></section></div>}
    {tab === 'summary' && <div className="atal-panel-placeholder"><CalendarDays /><h2>Resumen del plan</h2><p>{duration}, {frequency}. El plan contiene {exerciseIds.length} ejercicios.</p><button type="button" onClick={() => setTab('exercises')}>Editar ejercicios</button></div>}
    {tab === 'progress' && <div className="atal-panel-placeholder"><Target /><h2>Progreso del plan</h2><p>3 de 12 sesiones completadas con una adherencia demostrativa del 78%.</p></div>}
    {tab === 'review' && <div className="atal-panel-placeholder"><Check /><h2>Listo para revisión</h2><p>Comprueba frecuencia, ejercicios y criterios antes de activar o compartir el plan.</p><button type="button" onClick={() => router.push(`/plans/${planId}/share`)}>Compartir plan</button></div>}
    <button type="button" className="atal-submit-button atal-sticky-save" onClick={save}><Save /> {saved ? 'Plan guardado' : 'Guardar plan'} {saved && <Check />}</button>
  </main>}</AtalShell>;
}
