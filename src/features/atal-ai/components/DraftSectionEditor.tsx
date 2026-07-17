import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { AtalAIDraft } from '../types';

export type DraftSectionId = 'patient' | 'record' | 'plan' | 'exercises' | 'note' | 'session' | 'report' | 'export';

function split(value: string) { return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean); }

export function DraftSectionEditor({ section, draft, onSave, onCancel }: { section: DraftSectionId; draft: AtalAIDraft; onSave: (draft: AtalAIDraft) => void; onCancel: () => void }) {
  const [working, setWorking] = useState(() => structuredClone(draft));
  const [error, setError] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onCancel]);

  const patient = working.patient;
  const plan = working.plan;
  const setPatient = (patch: Partial<typeof patient>) => setWorking((current) => ({ ...current, patient:{ ...current.patient,...patch } }));
  const setPlan = (patch: Partial<typeof plan>) => setWorking((current) => ({ ...current, plan:{ ...current.plan,...patch } }));
  const setExercise = (id: string, patch: Partial<(typeof working.exercises)[number]>) => setWorking((current) => ({ ...current, exercises:current.exercises.map((item) => item.id === id ? { ...item,...patch } : item) }));
  const move = (index: number, delta: -1 | 1) => setWorking((current) => { const next=[...current.exercises];const target=index+delta;if(target<0||target>=next.length)return current;[next[index],next[target]]=[next[target],next[index]];return{...current,exercises:next}; });
  const addExercise = () => setWorking((current) => ({ ...current,exercises:[...current.exercises,{id:`ai-exercise-${Date.now()}`,name:'',region:'',category:'',objective:'',startingPosition:'',instructions:[],precautions:[],equipment:'',difficulty:'',sets:1,repetitions:'',duration:'',rest:'',maxPain:3,tags:[],notes:'',reusePreference:'create-new'}] }));
  const save = () => {
    if (section === 'patient' && working.intent === 'create_patient_plan' && !patient.name.trim()) return setError('Añade el nombre del paciente.');
    if (section === 'plan' && (!plan.title.trim() || !plan.goal.trim())) return setError('Completa el título y el objetivo del plan.');
    if (section === 'exercises' && (!working.exercises.length || working.exercises.some((item) => !item.name.trim() || item.sets === null))) return setError('Cada ejercicio necesita nombre y series.');
    if (section === 'note' && !working.command?.content.trim()) return setError('Escribe el contenido de la nota.');
    onSave({ ...working,updatedAt:new Date().toISOString() });
  };
  const title = {patient:'Paciente',record:'Expediente',plan:'Plan de tratamiento',exercises:'Ejercicios',note:'Nota clínica',session:'Sesión',report:'Reporte',export:'Exportación'}[section];

  return <div className="atal-command-dialog" role="dialog" aria-modal="true" aria-labelledby="atal-section-editor-title" onMouseDown={onCancel}>
    <section className="atal-section-editor" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>Editar sección</small><h2 id="atal-section-editor-title">{title}</h2></div><button ref={cancelRef} type="button" aria-label="Cancelar edición" onClick={onCancel}><X /></button></header>
      <div className="atal-section-editor-body">
        {section === 'patient' && <div className="atal-section-form"><Field label="Nombre" value={patient.name} onChange={(name) => setPatient({name})}/><Field label="Edad" type="number" value={patient.age?.toString() ?? ''} onChange={(value) => setPatient({age:value?Number(value):null})}/><Field label="Fecha de nacimiento" type="date" value={patient.birthDate} onChange={(birthDate) => setPatient({birthDate})}/><Field label="Motivo de consulta" value={patient.reasonForVisit} onChange={(reasonForVisit) => setPatient({reasonForVisit})} wide multiline/><Field label="Objetivo funcional" value={patient.goals.join('\n')} onChange={(value) => setPatient({goals:split(value)})} wide multiline/></div>}
        {section === 'record' && <div className="atal-section-form"><Field label="Tiempo y evolución" value={patient.evolutionTime} onChange={(evolutionTime) => setPatient({evolutionTime})} wide multiline/><Field label="Zona afectada" value={patient.affectedArea} onChange={(affectedArea) => setPatient({affectedArea})}/><Field label="Diagnóstico proporcionado" value={patient.providedDiagnosis} onChange={(providedDiagnosis) => setPatient({providedDiagnosis})} wide/><Field label="Hallazgos y notas clínicas" value={patient.clinicalNotes} onChange={(clinicalNotes) => setPatient({clinicalNotes})} wide multiline/><Field label="Limitaciones" value={patient.functionalLimitations.join('\n')} onChange={(value) => setPatient({functionalLimitations:split(value)})} wide multiline/><Field label="Antecedentes" value={patient.relevantHistory.join('\n')} onChange={(value) => setPatient({relevantHistory:split(value)})} wide multiline/><Field label="Precauciones" value={patient.precautions.join('\n')} onChange={(value) => setPatient({precautions:split(value)})} wide multiline/></div>}
        {section === 'plan' && <div className="atal-section-form"><Field label="Título" value={plan.title} onChange={(title) => setPlan({title})} wide/><Field label="Objetivo general" value={plan.goal} onChange={(goal) => setPlan({goal})} wide multiline/><Field label="Enfoque clínico" value={plan.focus} onChange={(focus) => setPlan({focus})} wide multiline/><Field label="Duración" value={plan.duration.customText || (plan.duration.value === null ? '' : String(plan.duration.value))} onChange={(value) => setPlan({duration:{...plan.duration,customText:value,value:null,unit:'custom'}})}/><Field label="Frecuencia" value={plan.frequency.customText || (plan.frequency.value === null ? '' : String(plan.frequency.value))} onChange={(value) => setPlan({frequency:{...plan.frequency,customText:value,value:null,period:'custom'}})}/><Field label="Criterios de progreso" value={plan.progressCriteria} onChange={(progressCriteria) => setPlan({progressCriteria})} wide multiline/><Field label="Indicaciones generales" value={plan.generalInstructions} onChange={(generalInstructions) => setPlan({generalInstructions})} wide multiline/></div>}
        {section === 'exercises' && <div className="atal-section-exercises">{working.exercises.map((exercise,index) => <article key={exercise.id}><header><b>{index+1}. {exercise.name || 'Nuevo ejercicio'}</b><div><button type="button" onClick={() => move(index,-1)} disabled={index===0} aria-label="Subir ejercicio"><ArrowUp/></button><button type="button" onClick={() => move(index,1)} disabled={index===working.exercises.length-1} aria-label="Bajar ejercicio"><ArrowDown/></button><button type="button" onClick={() => setWorking((current) => ({...current,exercises:current.exercises.filter((item)=>item.id!==exercise.id)}))} aria-label="Eliminar ejercicio"><Trash2/></button></div></header><div className="atal-section-form"><Field label="Nombre" value={exercise.name} onChange={(name) => setExercise(exercise.id,{name})}/><Field label="Región" value={exercise.region} onChange={(region) => setExercise(exercise.id,{region})}/><Field label="Objetivo" value={exercise.objective} onChange={(objective) => setExercise(exercise.id,{objective})} wide/><Field label="Series" type="number" value={exercise.sets?.toString() ?? ''} onChange={(value) => setExercise(exercise.id,{sets:value?Number(value):null})}/><Field label="Repeticiones o tiempo" value={exercise.repetitions || exercise.duration} onChange={(value) => setExercise(exercise.id,{repetitions:value,duration:''})}/><Field label="Instrucciones" value={exercise.instructions.join('\n')} onChange={(value) => setExercise(exercise.id,{instructions:split(value)})} wide multiline/><Field label="Precauciones" value={exercise.precautions.join('\n')} onChange={(value) => setExercise(exercise.id,{precautions:split(value)})} wide multiline/></div></article>)}<button type="button" className="atal-section-add" onClick={addExercise}><Plus/>Añadir ejercicio</button></div>}
        {section === 'note' && working.command && <div className="atal-section-form"><Field label="Nota clínica" value={working.command.content} onChange={(content) => setWorking((current) => ({...current,command:current.command?{...current.command,content}:null}))} wide multiline/></div>}
        {['session','report','export'].includes(section) && working.command && <div className="atal-section-form"><Field label="Instrucción" value={working.command.content || working.assistantMessage} onChange={(content) => setWorking((current) => ({...current,assistantMessage:content,command:current.command?{...current.command,content}:null}))} wide multiline/></div>}
        {error && <p className="atal-section-error" role="alert">{error}</p>}
      </div>
      <footer><button type="button" onClick={onCancel}>Cancelar</button><button type="button" className="is-primary" onClick={save}><Save/>Guardar sección</button></footer>
    </section>
  </div>;
}

function Field({ label,value,onChange,type='text',wide=false,multiline=false }: { label:string;value:string;onChange:(value:string)=>void;type?:string;wide?:boolean;multiline?:boolean }) {
  const id=useId();
  return <label className={wide?'is-wide':''} htmlFor={id}><span>{label}</span>{multiline?<textarea id={id} value={value} onChange={(event)=>onChange(event.target.value)}/>:<input id={id} type={type} value={value} onChange={(event)=>onChange(event.target.value)}/>}</label>;
}
