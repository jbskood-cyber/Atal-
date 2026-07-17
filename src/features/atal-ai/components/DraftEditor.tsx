import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ClipboardList, Dumbbell, Plus, RefreshCw, Save, Trash2, UserRound } from 'lucide-react';
import { AppSelect } from '@/src/components/atal/AppSelect';
import { getExerciseCatalog } from '@/src/data/localExercises';
import type { AtalAIDraft, PrivateContactDraft } from '../types';
import { useId } from 'react';

function splitList(value: string) { return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean); }
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' '); }

export function DraftEditor({ draft, contact, saving, saved, onChange, onContact, onRegeneratePlan, onRegenerateExercise, onConfirm }: { draft: AtalAIDraft; contact: PrivateContactDraft; saving: boolean; saved: boolean; onChange: (draft: AtalAIDraft) => void; onContact: (contact: PrivateContactDraft) => void; onRegeneratePlan: () => void; onRegenerateExercise: (id: string) => void; onConfirm: () => void }) {
  const patient = draft.patient;
  const plan = draft.plan;
  const setPatient = (patch: Partial<typeof patient>) => onChange({ ...draft, patient: { ...patient, ...patch }, updatedAt: new Date().toISOString() });
  const setPlan = (patch: Partial<typeof plan>) => onChange({ ...draft, plan: { ...plan, ...patch }, updatedAt: new Date().toISOString() });
  const updateExercise = (id: string, patch: Partial<(typeof draft.exercises)[number]>) => onChange({ ...draft, exercises: draft.exercises.map((exercise) => exercise.id === id ? { ...exercise, ...patch } : exercise), updatedAt: new Date().toISOString() });
  const move = (index: number, direction: -1 | 1) => { const next = [...draft.exercises]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onChange({ ...draft, exercises: next, updatedAt: new Date().toISOString() }); };
  const exerciseCatalog = getExerciseCatalog();
  const addExercise = () => onChange({ ...draft, exercises: [...draft.exercises, { id: `ai-exercise-${Date.now()}`, name: '', region: '', category: '', objective: '', startingPosition: '', instructions: [], precautions: [], equipment: '', difficulty: '', sets: 1, repetitions: '', duration: '', rest: '', maxPain: 3, tags: [], notes: '', reusePreference: 'create-new' }], updatedAt: new Date().toISOString() });
  const needsPatient = draft.intent !== 'create_exercise';
  const needsPlan = ['create_patient_plan','create_plan_for_existing_patient','update_existing_plan'].includes(draft.intent);
  const needsExercises = draft.intent !== 'update_patient_record';
  const canConfirm = (!needsPatient || draft.intent !== 'create_patient_plan' || patient.name.trim()) && (!needsPatient || draft.intent === 'create_patient_plan' || draft.selectedPatientId) && (!needsPlan || plan.title.trim()) && (draft.intent !== 'create_exercise' || draft.exercises.some((item) => item.name.trim()));

  return <section className="atal-ai-draft" aria-label="Borrador editable generado por Atal IA">
    <header><div><span><CheckCircle2 /></span><div><small>Borrador generado · Editable</small><h2>Revisa antes de aplicar</h2></div></div>{Boolean(draft.missingFields.length || draft.uncertainFields.length) && <em><AlertTriangle /> Requiere revisión</em>}</header>
    {(draft.missingFields.length > 0 || draft.uncertainFields.length > 0 || draft.contradictions.length > 0) && <aside className="atal-ai-review-flags">
      {draft.missingFields.length > 0 && <p><b>Faltan:</b> {draft.missingFields.join(', ')}</p>}
      {draft.uncertainFields.length > 0 && <p><b>Datos dudosos:</b> {draft.uncertainFields.join(', ')}</p>}
      {draft.contradictions.length > 0 && <p><b>Contradicciones:</b> {draft.contradictions.join(', ')}</p>}
    </aside>}

    {needsPatient&&<details open data-ai-section="patient" className="atal-ai-draft-block"><summary><span><UserRound /></span><b>Paciente</b><small>Información clínica extraída</small></summary><div className="atal-ai-edit-grid">
      <Field label="Nombre" value={patient.name} onChange={(name) => setPatient({ name })} />
      <Field label="Edad" type="number" value={patient.age?.toString() ?? ''} onChange={(value) => setPatient({ age: value ? Number(value) : null })} />
      <Field label="Fecha de nacimiento" type="date" value={patient.birthDate} onChange={(birthDate) => setPatient({ birthDate })} />
      <Field label="Sexo" value={patient.sex} onChange={(sex) => setPatient({ sex })} />
      <Field label="Motivo de consulta" value={patient.reasonForVisit} onChange={(reasonForVisit) => setPatient({ reasonForVisit })} wide />
      <Field label="Zona afectada" value={patient.affectedArea} onChange={(affectedArea) => setPatient({ affectedArea })} />
      <Field label="Tiempo de evolución" value={patient.evolutionTime} onChange={(evolutionTime) => setPatient({ evolutionTime })} />
      <Field label="Diagnóstico proporcionado" value={patient.providedDiagnosis} onChange={(providedDiagnosis) => setPatient({ providedDiagnosis })} wide />
      <Field label="Dolor actual (0–10)" type="number" value={patient.painLevel?.toString() ?? ''} onChange={(value) => setPatient({ painLevel: value ? Math.min(10, Math.max(0, Number(value))) : null })} />
      <Field label="Síntomas" value={patient.symptoms.join(', ')} onChange={(value) => setPatient({ symptoms: splitList(value) })} wide />
      <Field label="Objetivos (separados por coma)" value={patient.goals.join(', ')} onChange={(value) => setPatient({ goals: splitList(value) })} wide />
      <Field label="Limitaciones funcionales" value={patient.functionalLimitations.join(', ')} onChange={(value) => setPatient({ functionalLimitations: splitList(value) })} wide />
      <Field label="Antecedentes relevantes" value={patient.relevantHistory.join(', ')} onChange={(value) => setPatient({ relevantHistory: splitList(value) })} wide />
      <Field label="Precauciones" value={patient.precautions.join(', ')} onChange={(value) => setPatient({ precautions: splitList(value) })} wide />
      <Field label="Notas clínicas" value={patient.clinicalNotes} onChange={(clinicalNotes) => setPatient({ clinicalNotes })} wide multiline />
    </div></details>}

    {needsPlan&&<details open data-ai-section="plan" className="atal-ai-draft-block"><summary><span><ClipboardList /></span><b>Plan</b><small>Duración, frecuencia y objetivo</small></summary><div className="atal-ai-edit-grid">
      <Field label="Título" value={plan.title} onChange={(title) => setPlan({ title })} wide />
      <Field label="Objetivo principal" value={plan.goal} onChange={(goal) => setPlan({ goal })} wide multiline />
      <Field label="Enfoque" value={plan.focus} onChange={(focus) => setPlan({ focus })} wide />
      <Field label="Duración (cantidad)" type="number" value={plan.duration.value?.toString() ?? ''} onChange={(value) => setPlan({ duration: { ...plan.duration, value: value ? Number(value) : null } })} />
      <label className="atal-ai-field"><span>Unidad de duración</span><AppSelect label="Unidad de duración" value={{days:'Días',weeks:'Semanas',months:'Meses',custom:'Personalizada'}[plan.duration.unit]} options={['Días','Semanas','Meses','Personalizada']} onChange={(value) => setPlan({ duration: { ...plan.duration, unit: ({Días:'days',Semanas:'weeks',Meses:'months',Personalizada:'custom'} as const)[value as 'Días'|'Semanas'|'Meses'|'Personalizada'] } })} /></label>
      <Field label="Duración libre" value={plan.duration.customText} onChange={(customText) => setPlan({ duration: { ...plan.duration, customText } })} wide />
      <Field label="Frecuencia (sesiones)" type="number" value={plan.frequency.value?.toString() ?? ''} onChange={(value) => setPlan({ frequency: { ...plan.frequency, value: value ? Number(value) : null } })} />
      <label className="atal-ai-field"><span>Periodo</span><AppSelect label="Periodo de frecuencia" value={{day:'Por día',week:'Por semana',month:'Por mes',custom:'Personalizada'}[plan.frequency.period]} options={['Por día','Por semana','Por mes','Personalizada']} onChange={(value) => setPlan({ frequency: { ...plan.frequency, period: ({'Por día':'day','Por semana':'week','Por mes':'month',Personalizada:'custom'} as const)[value as 'Por día'|'Por semana'|'Por mes'|'Personalizada'] } })} /></label>
      <Field label="Frecuencia libre" value={plan.frequency.customText} onChange={(customText) => setPlan({ frequency: { ...plan.frequency, customText } })} wide />
      <Field label="Fases (una por línea)" value={plan.phases.join('\n')} onChange={(value) => setPlan({ phases: splitList(value) })} wide multiline />
      <Field label="Indicaciones generales" value={plan.generalInstructions} onChange={(generalInstructions) => setPlan({ generalInstructions })} wide multiline />
      <Field label="Criterios de progreso" value={plan.progressCriteria} onChange={(progressCriteria) => setPlan({ progressCriteria })} wide multiline />
      <label className="atal-ai-field"><span>Estado al confirmar</span><AppSelect label="Estado del plan" value={plan.status === 'active' ? 'Activo' : 'Borrador'} options={['Borrador','Activo']} onChange={(value) => setPlan({ status: value === 'Activo' ? 'active' : 'draft' })} /></label>
      <button type="button" className="atal-ai-regenerate" onClick={onRegeneratePlan}><RefreshCw /> Regenerar solo el plan</button>
    </div></details>}

    {needsExercises&&<details open data-ai-section="exercises" className="atal-ai-draft-block"><summary><span><Dumbbell /></span><b>Ejercicios ({draft.exercises.length})</b><small>Todos continúan editables</small></summary><div className="atal-ai-exercise-editor">
      {draft.exercises.map((exercise, index) => { const match = exerciseCatalog.find((item) => normalize(item.name) === normalize(exercise.name) && (!exercise.region.trim() || normalize(item.region) === normalize(exercise.region))); return <article key={exercise.id}><header><strong>{index + 1}. {exercise.name || 'Ejercicio sin nombre'}</strong><div><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir ejercicio"><ArrowUp /></button><button type="button" onClick={() => move(index, 1)} disabled={index === draft.exercises.length - 1} aria-label="Bajar ejercicio"><ArrowDown /></button><button type="button" onClick={() => onChange({ ...draft, exercises: draft.exercises.filter((item) => item.id !== exercise.id) })} aria-label="Eliminar ejercicio"><Trash2 /></button></div></header><div className="atal-ai-edit-grid">
        <Field label="Nombre" value={exercise.name} onChange={(name) => updateExercise(exercise.id, { name })} />
        <Field label="Región" value={exercise.region} onChange={(region) => updateExercise(exercise.id, { region })} />
        <Field label="Categoría" value={exercise.category} onChange={(category) => updateExercise(exercise.id, { category })} />
        <Field label="Dificultad" value={exercise.difficulty} onChange={(difficulty) => updateExercise(exercise.id, { difficulty })} />
        <Field label="Objetivo" value={exercise.objective} onChange={(objective) => updateExercise(exercise.id, { objective })} wide />
        <Field label="Series" type="number" value={exercise.sets?.toString() ?? ''} onChange={(value) => updateExercise(exercise.id, { sets: value ? Number(value) : null })} />
        <Field label="Repeticiones" value={exercise.repetitions} onChange={(repetitions) => updateExercise(exercise.id, { repetitions })} />
        <Field label="Tiempo" value={exercise.duration} onChange={(duration) => updateExercise(exercise.id, { duration })} />
        <Field label="Descanso" value={exercise.rest} onChange={(rest) => updateExercise(exercise.id, { rest })} />
        <Field label="Dolor máximo (0–10)" type="number" value={exercise.maxPain?.toString() ?? ''} onChange={(value) => updateExercise(exercise.id, { maxPain: value ? Math.min(10, Math.max(0, Number(value))) : null })} />
        <Field label="Posición inicial" value={exercise.startingPosition} onChange={(startingPosition) => updateExercise(exercise.id, { startingPosition })} wide multiline />
        <Field label="Instrucciones (una por línea)" value={exercise.instructions.join('\n')} onChange={(value) => updateExercise(exercise.id, { instructions: splitList(value) })} wide multiline />
        <Field label="Precauciones" value={exercise.precautions.join('\n')} onChange={(value) => updateExercise(exercise.id, { precautions: splitList(value) })} wide multiline />
        <Field label="Material" value={exercise.equipment} onChange={(equipment) => updateExercise(exercise.id, { equipment })} />
        <Field label="Etiquetas" value={exercise.tags.join(', ')} onChange={(value) => updateExercise(exercise.id, { tags: splitList(value) })} />
        <Field label="Observaciones" value={exercise.notes} onChange={(notes) => updateExercise(exercise.id, { notes })} wide multiline />
        {match && <label className="atal-ai-field is-wide"><span>Coincidencia exacta encontrada: {match.name}</span><AppSelect label="Cómo guardar este ejercicio" value={exercise.reusePreference === 'create-new' ? 'Crear ejercicio nuevo' : 'Reutilizar coincidencia exacta'} options={['Reutilizar coincidencia exacta','Crear ejercicio nuevo']} onChange={(value) => updateExercise(exercise.id, { reusePreference: value === 'Crear ejercicio nuevo' ? 'create-new' : 'reuse-exact' })} /></label>}
        <button type="button" className="atal-ai-regenerate" onClick={() => onRegenerateExercise(exercise.id)}><RefreshCw /> Alternativa para este ejercicio</button>
      </div></article>; })}
      <button type="button" className="atal-ai-add-exercise" onClick={addExercise}><Plus /> Añadir ejercicio manualmente</button>
    </div></details>}

    {draft.intent==='create_patient_plan'&&<details className="atal-ai-draft-block"><summary><span><UserRound /></span><b>Datos de contacto</b><small>Se completan manualmente · no se envían a Gemini</small></summary><div className="atal-ai-edit-grid">
      <Field label="Teléfono" value={contact.phone} onChange={(phone) => onContact({ ...contact, phone })} />
      <Field label="Correo" type="email" value={contact.email} onChange={(email) => onContact({ ...contact, email })} />
      <Field label="Dirección" value={contact.address} onChange={(address) => onContact({ ...contact, address })} wide />
      <Field label="Contacto de emergencia" value={contact.emergencyContact} onChange={(emergencyContact) => onContact({ ...contact, emergencyContact })} wide />
    </div></details>}
    <button type="button" className="atal-ai-confirm" disabled={saving || saved || !canConfirm} onClick={onConfirm}><Save /> {saved ? 'Aplicado a Atal' : saving ? 'Aplicando a Atal…' : 'Confirmar y aplicar a Atal'}</button>
    <small className="atal-ai-clinical-note">Atal IA propone. El fisioterapeuta revisa y confirma antes de guardar.</small>
  </section>;
}

function Field({ label, value, onChange, type = 'text', wide = false, multiline = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean; multiline?: boolean }) {
  const id = useId();
  return <label className={`atal-ai-field${wide ? ' is-wide' : ''}`} htmlFor={id}><span>{label}</span>{multiline ? <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} /> : <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}
