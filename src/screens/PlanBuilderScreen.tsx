'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, ChevronRight, ClipboardList, Plus, RefreshCw, Search, Star } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { ExerciseSelector } from '@/src/components/atal/ExerciseSelector';
import { CustomScheduleSelect } from '@/src/components/atal/CustomScheduleSelect';
import { exercises, patients } from '@/src/data/atal-demo';

export function PlanBuilderScreen() {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [patientIndex, setPatientIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [focus, setFocus] = useState('');
  const [duration, setDuration] = useState('4 semanas');
  const [frequency, setFrequency] = useState('3 veces por semana');
  const [goal, setGoal] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const patient = patients[patientIndex];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !selectedIds.length) return;
    window.sessionStorage.setItem('atal:new-plan', JSON.stringify({ title, focus, duration, frequency, goal, patient: patient.name, exerciseIds: selectedIds }));
    router.push('/plans/pl-new');
  };

  return <AtalShell>{selecting ? <main className="atal-content atal-flow-page"><ExerciseSelector initialIds={selectedIds} onBack={() => setSelecting(false)} onConfirm={(ids) => { setSelectedIds(ids); setSelecting(false); }} /></main> : <main className="atal-content atal-flow-page">
    <div className="atal-flow-topbar"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Constructor de plan</span><i /></div>
    <div className="atal-form-heading"><h1>Nuevo plan</h1><p>Define el objetivo y agrega los ejercicios de la primera fase.</p></div>
    <form className="atal-clinical-form atal-plan-form" onSubmit={submit}>
      <fieldset><label className="atal-field atal-field--full"><span>Paciente</span><button type="button" className="atal-patient-picker" onClick={() => setPatientIndex((value) => (value + 1) % 4)}><Avatar name={patient.name} /><span><b>{patient.name}</b><small>{patient.diagnosis}</small></span><ChevronRight /></button></label>
        <label className="atal-field atal-field--full"><span>Título del plan</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Rehabilitación funcional — Fase 1" /></label>
        <label className="atal-field atal-field--full"><span>Diagnóstico o área de enfoque</span><div className="atal-icon-field"><input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Ej. Dolor lumbar inespecífico" /><Search /></div></label>
        <div className="atal-field-grid atal-plan-schedule-grid"><label className="atal-field"><span>Duración total</span><CustomScheduleSelect mode="duration" label="Duración total" value={duration} options={['10 días','4 semanas','6 semanas','8 semanas','3 meses','Por definir','Sin duración estimada']} onChange={setDuration} icon={<CalendarDays/>}/></label><label className="atal-field"><span>Frecuencia</span><CustomScheduleSelect mode="frequency" label="Frecuencia" value={frequency} options={['1 vez por semana','2 veces por semana','3 veces por semana','Diario','Según tolerancia']} onChange={setFrequency} icon={<RefreshCw/>}/></label></div>
        <label className="atal-field atal-field--full"><span>Objetivo del plan</span><textarea maxLength={200} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Describe el objetivo principal del plan de rehabilitación…" /><small className="atal-character-count">{goal.length}/200</small></label>
      </fieldset>
      <fieldset><legend>Plantillas rápidas</legend><div className="atal-template-row"><button type="button" onClick={() => { setTitle('Rehabilitación lumbar — Fase 1'); setFocus('Lumbalgia crónica'); }}><Star /> Lumbalgia crónica</button><button type="button" onClick={() => setFocus('Dolor de hombro')}>Dolor de hombro</button><button type="button" onClick={() => setFocus('Cervicalgia')}>Cervicalgia</button></div></fieldset>
      <fieldset><legend>Ejercicios del plan</legend><button type="button" className="atal-add-exercises" onClick={() => setSelecting(true)}><span><Plus /></span><span><b>{selectedIds.length ? `${selectedIds.length} ejercicios seleccionados` : 'Agregar ejercicios'}</b><small>{selectedIds.length ? selectedIds.map((id) => exercises.find((item) => item.id === id)?.name).filter(Boolean).join(', ') : 'Busca y selecciona ejercicios para tu plan.'}</small></span><ChevronRight /></button></fieldset>
      <button type="submit" className="atal-submit-button" disabled={!title.trim() || !selectedIds.length}><ClipboardList /> Crear borrador</button>
    </form>
  </main>}</AtalShell>;
}
