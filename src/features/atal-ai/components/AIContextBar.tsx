import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardList, Dumbbell, Search, UserRound, X } from 'lucide-react';
import type { ExerciseEntity, PatientEntity, PlanEntity } from '@/src/data/atalStore';
import type { AIWorkContext, AtalAIIntent } from '../types';

export const intentOptions: Array<{ value: AtalAIIntent; label: string; group: string }> = [
  { value: 'create_patient_plan', label: 'Crear paciente y plan', group: 'Crear' },
  { value: 'create_plan_for_existing_patient', label: 'Crear plan', group: 'Crear' },
  { value: 'create_exercise', label: 'Crear ejercicio', group: 'Crear' },
  { value: 'update_patient_record', label: 'Actualizar expediente', group: 'Modificar' },
  { value: 'update_existing_plan', label: 'Modificar plan', group: 'Modificar' },
  { value: 'update_existing_exercise', label: 'Modificar ejercicio', group: 'Modificar' },
  { value: 'add_patient_note', label: 'Añadir nota clínica', group: 'Modificar' },
  { value: 'update_plan_status', label: 'Cambiar estado del plan', group: 'Modificar' },
  { value: 'archive_plan', label: 'Archivar plan', group: 'Modificar' },
  { value: 'restore_plan', label: 'Restaurar plan', group: 'Modificar' },
  { value: 'replace_active_plan', label: 'Reemplazar plan activo', group: 'Modificar' },
  { value: 'search_patient', label: 'Buscar paciente', group: 'Consultar' },
  { value: 'summarize_patient', label: 'Revisar evolución', group: 'Consultar' },
  { value: 'summarize_sessions', label: 'Resumir sesiones', group: 'Consultar' },
  { value: 'create_report', label: 'Preparar reporte', group: 'Consultar' },
  { value: 'export_data', label: 'Generar exportación', group: 'Otros' },
  { value: 'update_settings', label: 'Actualizar ajustes', group: 'Otros' },
];

const patientIntents = new Set<AtalAIIntent>(['create_plan_for_existing_patient','update_patient_record','update_existing_plan','add_patient_note','update_plan_status','archive_plan','restore_plan','replace_active_plan','summarize_patient','summarize_sessions','create_report']);
const planIntents = new Set<AtalAIIntent>(['update_existing_plan','update_plan_status','archive_plan','restore_plan','replace_active_plan']);
const exerciseIntents = new Set<AtalAIIntent>(['update_existing_exercise']);

export function formatWorkContextLabel(context: AIWorkContext, patients: PatientEntity[], plans: PlanEntity[], exercises: ExerciseEntity[]) {
  const intent = intentOptions.find((item) => item.value === context.intent)?.label ?? 'Definir acción';
  const patient = patients.find((item) => item.id === context.selectedPatientId)?.name;
  const plan = plans.find((item) => item.id === context.selectedPlanId)?.title;
  const exercise = exercises.find((item) => item.id === context.selectedExerciseId)?.name;
  return [intent, patient, plan, exercise].filter(Boolean).join(' · ');
}

export function AIContextBar({ open, context, patients, plans, exercises, onChange, onClose }: { open: boolean; context: AIWorkContext; patients: PatientEntity[]; plans: PlanEntity[]; exercises: ExerciseEntity[]; onChange: (context: AIWorkContext) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const needsPatient = patientIntents.has(context.intent);
  const needsPlan = planIntents.has(context.intent);
  const needsExercise = exerciseIntents.has(context.intent);
  const filteredPatients = useMemo(() => patients.filter((item) => item.status !== 'archived' && `${item.name} ${item.diagnosis}`.toLowerCase().includes(query.toLowerCase())).slice(0,8), [patients,query]);
  const availablePlans = plans.filter((item) => item.patientId === context.selectedPatientId);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('atal-context-active');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('keydown', close); document.body.classList.remove('atal-context-active'); document.body.style.overflow = previousOverflow; };
  }, [open,onClose]);
  if (!open) return null;

  const selectIntent = (intent: AtalAIIntent) => {
    const needsExistingPatient = patientIntents.has(intent);
    onChange({
      intent,
      patientMode: intent === 'create_patient_plan' ? 'new' : needsExistingPatient ? 'existing' : 'none',
      selectedPatientId: needsExistingPatient ? context.selectedPatientId : '',
      selectedPlanId: planIntents.has(intent) ? context.selectedPlanId : '',
      selectedExerciseId: exerciseIntents.has(intent) ? context.selectedExerciseId : '',
    });
  };

  return <div className="atal-command-dialog" role="dialog" aria-modal="true" aria-labelledby="atal-context-title" onMouseDown={onClose}>
    <section className="atal-context-sheet" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>Atal IA</small><h2 id="atal-context-title">¿En qué vamos a trabajar?</h2></div><button ref={closeRef} type="button" aria-label="Cerrar contexto" onClick={onClose}><X /></button></header>
      <div className="atal-context-actions">
        {intentOptions.map((item) => <button type="button" key={item.value} className={context.intent === item.value ? 'is-selected' : ''} onClick={() => selectIntent(item.value)}><span>{item.group === 'Crear' ? <ClipboardList /> : item.group === 'Consultar' ? <Search /> : <UserRound />}</span><b>{item.label}</b>{context.intent === item.value && <Check />}</button>)}
      </div>
      {needsPatient && <div className="atal-context-entity"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar paciente por nombre o motivo" /></label><div>{filteredPatients.map((patient) => <button type="button" key={patient.id} className={patient.id === context.selectedPatientId ? 'is-selected' : ''} onClick={() => onChange({ ...context, patientMode:'existing', selectedPatientId:patient.id, selectedPlanId:'' })}><UserRound /><span><b>{patient.name}</b><small>{patient.diagnosis}</small></span>{patient.id === context.selectedPatientId && <Check />}</button>)}{!filteredPatients.length && <p>No encontramos pacientes.</p>}</div></div>}
      {needsPlan && context.selectedPatientId && <div className="atal-context-entity"><h3>Plan</h3><div>{availablePlans.map((plan) => <button type="button" key={plan.id} className={plan.id === context.selectedPlanId ? 'is-selected' : ''} onClick={() => onChange({ ...context, selectedPlanId:plan.id })}><ClipboardList /><span><b>{plan.title}</b><small>{plan.status}</small></span>{plan.id === context.selectedPlanId && <Check />}</button>)}{!availablePlans.length && <p>Este paciente todavía no tiene planes.</p>}</div></div>}
      {needsExercise && <div className="atal-context-entity"><h3>Ejercicio</h3><div>{exercises.filter((item)=>item.status==='active').map((exercise) => <button type="button" key={exercise.id} className={exercise.id === context.selectedExerciseId ? 'is-selected' : ''} onClick={() => onChange({ ...context, selectedExerciseId:exercise.id })}><Dumbbell /><span><b>{exercise.name}</b><small>{exercise.region} · {exercise.category}</small></span>{exercise.id === context.selectedExerciseId && <Check />}</button>)}{!exercises.length && <p>Todavía no hay ejercicios.</p>}</div></div>}
      <button type="button" className="atal-context-done" disabled={(needsPatient && !context.selectedPatientId) || (needsPlan && !context.selectedPlanId) || (needsExercise && !context.selectedExerciseId)} onClick={onClose}>Usar este contexto</button>
    </section>
  </div>;
}
