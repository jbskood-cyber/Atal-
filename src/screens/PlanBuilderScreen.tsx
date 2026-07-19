'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, ChevronRight, ClipboardList, Plus, RefreshCw, Search, Star } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { ExerciseSelector } from '@/src/components/atal/ExerciseSelector';
import { CustomScheduleSelect } from '@/src/components/atal/CustomScheduleSelect';
import { usePatientCatalog } from '@/src/data/localPatients';
import { useExerciseCatalog } from '@/src/data/localExercises';
import { createLocalPlan } from '@/src/data/localPlans';
import { AppSelect } from '@/src/components/atal/AppSelect';

export function PlanBuilderScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [selecting, setSelecting] = useState(false);
  const patients = usePatientCatalog().filter((item) => item.status !== 'archived');
  const requestedPatientId = params.get('patientId') ?? '';
  const [patientId, setPatientId] = useState(requestedPatientId);
  const [title, setTitle] = useState('');
  const [focus, setFocus] = useState('');
  const [duration, setDuration] = useState('4 semanas');
  const [frequency, setFrequency] = useState('3 veces por semana');
  const [goal, setGoal] = useState('');
  const [progression, setProgression] = useState('Aumentar según tolerancia y calidad del movimiento.');
  const [reportCriteria, setReportCriteria] = useState('Reportar dolor elevado, síntomas o imposibilidad para completar.');
  const [generalInstructions, setGeneralInstructions] = useState('Realiza los ejercicios con calma y sigue las indicaciones de tu fisioterapeuta.');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const patient = patients.find((item) => item.id === patientId) ?? patients.find((item) => item.id === requestedPatientId) ?? patients[0];
  const exerciseCatalog = useExerciseCatalog();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !selectedIds.length) return;
    if (!patient) return;
    const plan = createLocalPlan({ patientId: patient.id, title, focus, duration, frequency, goal, exerciseIds: selectedIds, status: 'draft', progression, reportCriteria, generalInstructions });
    router.push(`/plans/${plan.id}`);
  };

  return <AtalShell>{selecting ? <main className="atal-content atal-flow-page"><ExerciseSelector initialIds={selectedIds} onBack={() => setSelecting(false)} onConfirm={(ids) => { setSelectedIds(ids); setSelecting(false); }} /></main> : <main className="atal-content atal-flow-page">
    <div className="atal-flow-topbar"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Constructor de plan</span><i /></div>
    <div className="atal-form-heading"><h1>Nuevo plan</h1></div>
    <form className="atal-clinical-form atal-plan-form" onSubmit={submit}>
      <fieldset><label className="atal-field atal-field--full"><span>Paciente</span>{patient ? <div className="atal-patient-picker"><Avatar name={patient.name} /><span><b>{patient.name}</b><small>{patient.diagnosis}</small></span><AppSelect label="Seleccionar paciente" value={patient.name} options={patients.map((item) => item.name)} onChange={(name) => setPatientId(patients.find((item) => item.name === name)?.id ?? '')} /></div> : <button type="button" className="atal-patient-picker" onClick={() => router.push('/patients/new')}><Plus/><span><b>Crear paciente primero</b><small>No hay pacientes disponibles.</small></span><ChevronRight/></button>}</label>
        <label className="atal-field atal-field--full"><span>Título del plan</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Rehabilitación funcional — Fase 1" /></label>
        <label className="atal-field atal-field--full"><span>Diagnóstico o área de enfoque</span><div className="atal-icon-field"><input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Ej. Dolor lumbar inespecífico" /><Search /></div></label>
        <div className="atal-field-grid atal-plan-schedule-grid"><label className="atal-field"><span>Duración total</span><CustomScheduleSelect mode="duration" label="Duración total" value={duration} options={['10 días','4 semanas','6 semanas','8 semanas','3 meses','Por definir','Sin duración estimada']} onChange={setDuration} icon={<CalendarDays/>}/></label><label className="atal-field"><span>Frecuencia</span><CustomScheduleSelect mode="frequency" label="Frecuencia" value={frequency} options={['1 vez por semana','2 veces por semana','3 veces por semana','Diario','Según tolerancia']} onChange={setFrequency} icon={<RefreshCw/>}/></label></div>
        <label className="atal-field atal-field--full"><span>Objetivo del plan</span><textarea maxLength={200} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Describe el objetivo principal del plan de rehabilitación…" /><small className="atal-character-count">{goal.length}/200</small></label>
      </fieldset>
      <fieldset><legend>Seguimiento clínico</legend><label className="atal-field atal-field--full"><span>Progresión</span><textarea value={progression} onChange={(event)=>setProgression(event.target.value)} /></label><label className="atal-field atal-field--full"><span>Criterio de reporte</span><textarea value={reportCriteria} onChange={(event)=>setReportCriteria(event.target.value)} /></label><label className="atal-field atal-field--full"><span>Indicaciones para el paciente</span><textarea value={generalInstructions} onChange={(event)=>setGeneralInstructions(event.target.value)} /></label></fieldset>
      <fieldset><legend>Plantillas rápidas</legend><div className="atal-template-row"><button type="button" onClick={() => { setTitle('Rehabilitación lumbar — Fase 1'); setFocus('Lumbalgia crónica'); }}><Star /> Lumbalgia crónica</button><button type="button" onClick={() => setFocus('Dolor de hombro')}>Dolor de hombro</button><button type="button" onClick={() => setFocus('Cervicalgia')}>Cervicalgia</button></div></fieldset>
      <fieldset><legend>Ejercicios del plan</legend><button type="button" className="atal-add-exercises" onClick={() => setSelecting(true)}><span><Plus /></span><span><b>{selectedIds.length ? `${selectedIds.length} ejercicios seleccionados` : 'Agregar ejercicios'}</b><small>{selectedIds.length ? selectedIds.map((id) => exerciseCatalog.find((item) => item.id === id)?.name).filter(Boolean).join(', ') : 'Biblioteca clínica'}</small></span><ChevronRight /></button></fieldset>
      <button type="submit" className="atal-submit-button" disabled={!patient || !title.trim() || !selectedIds.length}><ClipboardList /> Crear borrador de plan</button>
    </form>
  </main>}</AtalShell>;
}
