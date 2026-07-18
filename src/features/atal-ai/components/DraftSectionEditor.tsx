import { ArrowDown, ArrowUp, Check, Library, MoreHorizontal, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type TextareaHTMLAttributes } from 'react';
import { useAtalStore } from '@/src/data/atalStore';
import { AppSelect } from '@/src/components/atal/AppSelect';
import { exerciseEntityToDraft, mergeExerciseDrafts } from '../data/exerciseDraftAdapter';
import type { AIExerciseDraft, AtalAIDraft } from '../types';

export type DraftSectionId = 'patient' | 'record' | 'plan' | 'exercises' | 'note' | 'session' | 'report' | 'export';

function split(value: string) { return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean); }

export function DraftSectionEditor({ section, draft, onSave, onCancel }: { section: DraftSectionId; draft: AtalAIDraft; onSave: (draft: AtalAIDraft) => void; onCancel: () => void }) {
  const [working, setWorking] = useState(() => structuredClone(draft));
  const [error, setError] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [exerciseMenu, setExerciseMenu] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.body.classList.add('atal-context-active');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') libraryOpen ? setLibraryOpen(false) : onCancel(); };
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('keydown', close); document.body.classList.remove('atal-context-active'); document.body.style.overflow = previousOverflow; };
  }, [libraryOpen, onCancel]);

  const patient = working.patient;
  const plan = working.plan;
  const setPatient = (patch: Partial<typeof patient>) => setWorking((current) => ({ ...current, patient: { ...current.patient, ...patch } }));
  const setPlan = (patch: Partial<typeof plan>) => setWorking((current) => ({ ...current, plan: { ...current.plan, ...patch } }));
  const setExercise = (id: string, patch: Partial<AIExerciseDraft>) => setWorking((current) => ({ ...current, exercises: current.exercises.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  const move = (index: number, delta: -1 | 1) => setWorking((current) => { const next = [...current.exercises]; const target = index + delta; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return { ...current, exercises: next }; });
  const addExercise = () => setWorking((current) => ({ ...current, exercises: [...current.exercises, { id: `ai-exercise-${Date.now()}`, name: '', region: '', category: '', objective: '', startingPosition: '', instructions: [], precautions: [], equipment: '', difficulty: '', sets: 1, repetitions: '', duration: '', rest: '', maxPain: 3, tags: [], notes: '', reusePreference: 'create-new' }] }));
  const save = () => {
    if (section === 'patient' && working.intent === 'create_patient_plan' && !patient.name.trim()) return setError('Añade el nombre del paciente.');
    if (section === 'plan' && (!plan.title.trim() || !plan.goal.trim())) return setError('Completa el título y el objetivo del plan.');
    if (section === 'exercises' && (!working.exercises.length || working.exercises.some((item) => !item.name.trim() || item.sets === null))) return setError('Cada ejercicio necesita nombre y series.');
    if (section === 'note' && !working.command?.content.trim()) return setError('Escribe el contenido de la nota.');
    onSave({ ...working, updatedAt: new Date().toISOString() });
  };
  const title = { patient: 'Paciente', record: 'Expediente', plan: 'Plan de tratamiento', exercises: 'Ejercicios', note: 'Nota clínica', session: 'Sesión', report: 'Reporte', export: 'Exportación' }[section];

  return <div className="atal-command-dialog" role="dialog" aria-modal="true" aria-labelledby="atal-section-editor-title" onMouseDown={onCancel}>
    <section className="atal-section-editor is-note-editor" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>Editar sección</small><h2 id="atal-section-editor-title">{title}</h2></div><button ref={cancelRef} type="button" aria-label="Cancelar edición" onClick={onCancel}><X /></button></header>
      <div className="atal-section-editor-body">
        {section === 'patient' && <div className="atal-note-form"><NoteField label="Nombre" value={patient.name} onChange={(name) => setPatient({ name })} /><NoteField label="Edad" value={patient.age?.toString() ?? ''} inputMode="numeric" onChange={(value) => setPatient({ age: value === '' ? null : Number(value.replace(/\D/g, '')) })} /><NoteField label="Fecha de nacimiento" value={patient.birthDate} onChange={(birthDate) => setPatient({ birthDate })} /><NoteField label="Motivo de consulta" value={patient.reasonForVisit} onChange={(reasonForVisit) => setPatient({ reasonForVisit })} /><NoteField label="Objetivo funcional" value={patient.goals.join('\n')} onChange={(value) => setPatient({ goals: split(value) })} /></div>}
        {section === 'record' && <div className="atal-note-form"><NoteField label="Tiempo y evolución" value={patient.evolutionTime} onChange={(evolutionTime) => setPatient({ evolutionTime })} /><NoteField label="Zona afectada" value={patient.affectedArea} onChange={(affectedArea) => setPatient({ affectedArea })} /><NoteField label="Diagnóstico" value={patient.providedDiagnosis} onChange={(providedDiagnosis) => setPatient({ providedDiagnosis })} /><NoteField label="Hallazgos y notas" value={patient.clinicalNotes} onChange={(clinicalNotes) => setPatient({ clinicalNotes })} /><NoteField label="Limitaciones" value={patient.functionalLimitations.join('\n')} onChange={(value) => setPatient({ functionalLimitations: split(value) })} /><NoteField label="Antecedentes" value={patient.relevantHistory.join('\n')} onChange={(value) => setPatient({ relevantHistory: split(value) })} /><NoteField label="Precauciones" value={patient.precautions.join('\n')} onChange={(value) => setPatient({ precautions: split(value) })} /></div>}
        {section === 'plan' && <div className="atal-note-form"><NoteField label="Título" value={plan.title} onChange={(title) => setPlan({ title })} /><NoteField label="Objetivo general" value={plan.goal} onChange={(goal) => setPlan({ goal })} /><NoteField label="Enfoque clínico" value={plan.focus} onChange={(focus) => setPlan({ focus })} /><NoteField label="Duración" value={plan.duration.customText || (plan.duration.value === null ? '' : String(plan.duration.value))} onChange={(value) => setPlan({ duration: { ...plan.duration, customText: value, value: null, unit: 'custom' } })} /><NoteField label="Frecuencia" value={plan.frequency.customText || (plan.frequency.value === null ? '' : String(plan.frequency.value))} onChange={(value) => setPlan({ frequency: { ...plan.frequency, customText: value, value: null, period: 'custom' } })} /><NoteField label="Criterios de progreso" value={plan.progressCriteria} onChange={(progressCriteria) => setPlan({ progressCriteria })} /><NoteField label="Indicaciones generales" value={plan.generalInstructions} onChange={(generalInstructions) => setPlan({ generalInstructions })} /></div>}
        {section === 'exercises' && <div className="atal-section-exercises is-note-list">{working.exercises.map((exercise, index) => <article key={exercise.id}><header><span><b>{index + 1}. {exercise.name || 'Nuevo ejercicio'}</b>{exercise.sourceExerciseId && <small>Biblioteca · {exercise.sourceExerciseId}</small>}</span><div><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir ejercicio"><ArrowUp /></button><button type="button" onClick={() => move(index, 1)} disabled={index === working.exercises.length - 1} aria-label="Bajar ejercicio"><ArrowDown /></button><button type="button" onClick={() => setExerciseMenu((current) => current === exercise.id ? null : exercise.id)} aria-label={`Más acciones de ${exercise.name || 'ejercicio'}`} aria-expanded={exerciseMenu === exercise.id}><MoreHorizontal /></button></div></header>{exerciseMenu === exercise.id && <div className="atal-exercise-more-menu" role="menu"><button type="button" role="menuitem" className="is-danger" onClick={() => { setExerciseMenu(null); setPendingRemove(exercise.id); }}><Trash2 />Eliminar ejercicio</button></div>}{pendingRemove === exercise.id && <div className="atal-exercise-delete-confirm" role="alertdialog" aria-label={`Eliminar ${exercise.name || 'ejercicio'}`}><p>¿Eliminar del borrador?</p><button type="button" onClick={() => setPendingRemove(null)}>Cancelar</button><button type="button" className="is-danger" onClick={() => { setWorking((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== exercise.id) })); setPendingRemove(null); }}>Eliminar</button></div>}<div className="atal-note-form"><NoteField label="Nombre" value={exercise.name} onChange={(name) => setExercise(exercise.id, { name })} /><NoteField label="Región" value={exercise.region} onChange={(region) => setExercise(exercise.id, { region })} /><NoteField label="Objetivo" value={exercise.objective} onChange={(objective) => setExercise(exercise.id, { objective })} /><NoteField label="Series" value={exercise.sets?.toString() ?? ''} inputMode="numeric" onChange={(value) => setExercise(exercise.id, { sets: value === '' ? null : Number(value.replace(/\D/g, '')) })} /><NoteField label="Repeticiones o tiempo" value={exercise.repetitions || exercise.duration} onChange={(value) => setExercise(exercise.id, { repetitions: value, duration: '' })} /><NoteField label="Instrucciones" value={exercise.instructions.join('\n')} onChange={(value) => setExercise(exercise.id, { instructions: split(value) })} /><NoteField label="Precauciones" value={exercise.precautions.join('\n')} onChange={(value) => setExercise(exercise.id, { precautions: split(value) })} /></div></article>)}<div className="atal-section-add-actions"><button type="button" className="atal-section-add" onClick={() => setLibraryOpen(true)}><Library />Biblioteca</button><button type="button" className="atal-section-add" onClick={addExercise}><Plus />Personalizado</button></div></div>}
        {section === 'note' && working.command && <div className="atal-note-form"><NoteField label="Nota clínica" value={working.command.content} onChange={(content) => setWorking((current) => ({ ...current, command: current.command ? { ...current.command, content } : null }))} /></div>}
        {['session', 'report', 'export'].includes(section) && working.command && <div className="atal-note-form"><NoteField label="Instrucción" value={working.command.content || working.assistantMessage} onChange={(content) => setWorking((current) => ({ ...current, assistantMessage: content, command: current.command ? { ...current.command, content } : null }))} /></div>}
        {error && <p className="atal-section-error" role="alert">{error}</p>}
      </div>
      <footer><button type="button" onClick={onCancel}>Cancelar</button><button type="button" className="is-primary" onClick={save}><Save />Guardar sección</button></footer>
    </section>
    {libraryOpen && <DraftExerciseLibrary selected={working.exercises} onClose={() => setLibraryOpen(false)} onConfirm={(exercises) => { setWorking((current) => ({ ...current, exercises: mergeExerciseDrafts(current.exercises, exercises) })); setLibraryOpen(false); }} />}
  </div>;
}

function NoteField({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (value: string) => void; inputMode?: TextareaHTMLAttributes<HTMLTextAreaElement>['inputMode'] }) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const field = ref.current; if (!field) return; field.style.height = '0px'; field.style.height = `${Math.max(30, field.scrollHeight)}px`; }, [value]);
  return <label htmlFor={id}><span>{label}</span><textarea ref={ref} id={id} rows={1} inputMode={inputMode} value={value} onChange={(event) => onChange(inputMode === 'numeric' ? event.target.value.replace(/[^0-9]/g, '') : event.target.value)} /></label>;
}

function DraftExerciseLibrary({ selected, onClose, onConfirm }: { selected: AIExerciseDraft[]; onClose: () => void; onConfirm: (items: AIExerciseDraft[]) => void }) {
  const exercises = useAtalStore((state) => state.exercises.filter((item) => item.status === 'active'));
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('Todas');
  const [difficulty, setDifficulty] = useState('Todas');
  const [equipment, setEquipment] = useState('Todos');
  const [ids, setIds] = useState(() => selected.map((item) => item.sourceExerciseId).filter((id): id is string => Boolean(id)));
  const regions = ['Todas', ...new Set(exercises.map((item) => item.region))];
  const difficulties = ['Todas', ...new Set(exercises.map((item) => item.difficulty).filter(Boolean))];
  const equipmentOptions = ['Todos', ...new Set(exercises.map((item) => item.equipment).filter(Boolean))];
  const visible = useMemo(() => exercises.filter((item) => (region === 'Todas' || item.region === region) && (difficulty === 'Todas' || item.difficulty === difficulty) && (equipment === 'Todos' || item.equipment === equipment) && `${item.name} ${item.category} ${item.region}`.toLowerCase().includes(query.toLowerCase())), [exercises, query, region, difficulty, equipment]);
  const toggle = (id: string) => setIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <div className="atal-draft-library" role="dialog" aria-modal="true" aria-label="Biblioteca de ejercicios" onMouseDown={onClose}><section onMouseDown={(event) => event.stopPropagation()}><header><div><small>Plan</small><h2>Biblioteca de ejercicios</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X /></button></header><label className="atal-draft-library-search"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" /></label><div className="atal-draft-library-filters"><AppSelect label="Zona corporal" value={region} options={regions} className="is-compact" onChange={setRegion}/><AppSelect label="Dificultad" value={difficulty} options={difficulties} className="is-compact" onChange={setDifficulty}/><AppSelect label="Equipamiento" value={equipment} options={equipmentOptions} className="is-compact" onChange={setEquipment}/></div><div className="atal-draft-library-results">{visible.map((exercise) => { const active = ids.includes(exercise.id); return <button type="button" key={exercise.id} className={active ? 'is-selected' : ''} aria-pressed={active} onClick={() => toggle(exercise.id)}><span><b>{exercise.name}</b><small>{exercise.region} · {exercise.difficulty} · {exercise.equipment}</small></span>{active ? <Check /> : <Plus />}</button>; })}{!visible.length && <p>Sin resultados</p>}</div><footer><span>{ids.length} seleccionados</span><button type="button" disabled={!ids.length} onClick={() => onConfirm(exercises.filter((item) => ids.includes(item.id)).map(exerciseEntityToDraft))}>Agregar al borrador</button></footer></section></div>;
}
