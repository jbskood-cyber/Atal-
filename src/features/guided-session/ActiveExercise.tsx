import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, ChevronRight, Clock3, Dumbbell, ImageOff, RotateCcw, Square, TimerReset } from 'lucide-react';
import type { DiscomfortReport, ExerciseRecord, ExerciseResult, GuidedExercise, Symptom } from './types';
import { RestTimer } from './RestTimer';
import { SemanticSlider } from './SemanticSlider';
import { SymptomPicker } from './SymptomPicker';
import { getExerciseMedia,mediaObjectUrls } from '@/src/data/exerciseMediaRepository';
import { commitNumericDraft } from '@/src/lib/numericInput';

const resultOptions: { id: ExerciseResult; label: string }[] = [{ id: 'completed', label: 'Completado' }, { id: 'partial', label: 'Parcialmente' }, { id: 'skipped', label: 'No pude hacerlo' }];

export function ActiveExercise({ exercise, record, index, total, onChange, onPrevious, onNext, onFinishEarly }: { exercise: GuidedExercise; record: ExerciseRecord; index: number; total: number; onChange: (record: ExerciseRecord) => void; onPrevious: () => void; onNext: () => void; onFinishEarly: () => void }) {
  const [rest, setRest] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(Boolean(record.discomfort));
  const completedSets = record.sets.filter((set) => set.completed).length;
  const discomfort: DiscomfortReport = record.discomfort ?? { pain: 0, effort: 3, fatigue: 0, symptoms: ['ninguno'], comment: '' };
  const updateDiscomfort = (next: Partial<DiscomfortReport>) => onChange({ ...record, discomfort: { ...discomfort, ...next } });
  const updateSet = (setIndex: number, next: Partial<ExerciseRecord['sets'][number]>) => onChange({ ...record, sets: record.sets.map((set, position) => position === setIndex ? { ...set, ...next } : set) });
  const toggleSet = (setIndex: number) => { const completing = !record.sets[setIndex].completed; updateSet(setIndex, { completed: completing }); if (completing && exercise.restSeconds > 0 && setIndex < record.sets.length - 1) setRest(true); };

  return <section className="atal-guided-exercise">
    <div className="atal-exercise-position"><span>Ejercicio {index + 1} de {total}</span><strong>{completedSets}/{exercise.sets} series</strong></div>
    <ExerciseMedia exercise={exercise} />
    <header><span>{exercise.region}</span><h1>{exercise.name}</h1><p>{exercise.objective}</p></header>
    <div className="atal-exercise-prescription"><span><Dumbbell /><b>{exercise.sets}</b><small>series</small></span><span><RotateCcw /><b>{exercise.repetitions ? `${exercise.repetitions}` : `${exercise.seconds}s`}</b><small>{exercise.repetitions ? 'repeticiones' : 'por serie'}</small></span><span><Clock3 /><b>{exercise.restSeconds}s</b><small>descanso</small></span><span><AlertCircle /><b>{exercise.maxPain === null ? '—' : `${exercise.maxPain}/10`}</b><small>dolor máximo</small></span></div>
    <div className="atal-exercise-instructions"><article><b>Material</b><p>{exercise.equipment}</p></article><article><b>Posición inicial</b><p>{exercise.startingPosition}</p></article><article><b>Cómo hacerlo</b><ol>{exercise.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></article><article className="is-caution"><b>Precauciones</b><p>{exercise.precautions}</p></article><blockquote>{exercise.therapistCue}</blockquote></div>
    <section className="atal-set-control"><div className="atal-set-heading"><div><span>Control de series</span><h2>Registra lo realizado</h2></div><strong>{completedSets}/{exercise.sets}</strong></div>{record.sets.map((set, setIndex) => <div className={set.completed ? 'atal-set-row is-complete' : 'atal-set-row'} key={setIndex}><button type="button" aria-label={`${set.completed ? 'Desmarcar' : 'Completar'} serie ${setIndex + 1}`} onClick={() => toggleSet(setIndex)}>{set.completed ? <Check /> : <Square />}</button><b>Serie {setIndex + 1}</b>{exercise.repetitions && <label><span>Reps.</span><EditableNumber ariaLabel={`Repeticiones realizadas en serie ${setIndex + 1}`} value={set.repetitions ?? exercise.repetitions} onCommit={(repetitions) => updateSet(setIndex, { repetitions })} /></label>}{exercise.seconds && <label><span>Seg.</span><EditableNumber ariaLabel={`Segundos realizados en serie ${setIndex + 1}`} value={set.seconds ?? exercise.seconds} onCommit={(seconds) => updateSet(setIndex, { seconds })} /></label>}</div>)}</section>
    <section className="atal-exercise-result"><span>Resultado del ejercicio</span><div>{resultOptions.map((option) => <button type="button" aria-pressed={record.result === option.id} className={record.result === option.id ? 'is-active' : ''} key={option.id} onClick={() => onChange({ ...record, result: option.id })}>{option.id === 'completed' && <Check />}{option.label}</button>)}</div><button type="button" className="atal-report-discomfort" onClick={() => setFeedbackOpen((value) => !value)}><AlertCircle /> Reportar dolor o molestia</button>{feedbackOpen && <div className="atal-discomfort-panel"><SemanticSlider label="Dolor durante el ejercicio" value={discomfort.pain} onChange={(pain) => updateDiscomfort({ pain })} /><SemanticSlider label="Esfuerzo" value={discomfort.effort} min={1} max={5} onChange={(effort) => updateDiscomfort({ effort })} /><SemanticSlider label="Fatiga" value={discomfort.fatigue} onChange={(fatigue) => updateDiscomfort({ fatigue })} /><label><span>Síntomas</span><SymptomPicker value={discomfort.symptoms as Symptom[]} onChange={(symptoms) => updateDiscomfort({ symptoms })} /></label><label className="atal-session-comment"><span>Comentario opcional</span><textarea value={discomfort.comment} onChange={(event) => updateDiscomfort({ comment: event.target.value })} placeholder="¿Qué sentiste y en qué momento?" /></label></div>}</section>
    <div className="atal-session-navigation"><button type="button" onClick={onPrevious} disabled={index === 0}><ArrowLeft /> Anterior</button><button type="button" className="atal-session-primary" disabled={!record.result} onClick={onNext}>{index === total - 1 ? 'Continuar al cierre' : 'Siguiente ejercicio'} <ChevronRight /></button></div><button type="button" className="atal-finish-early" onClick={onFinishEarly}>Finalizar sesión</button>
    {rest && <RestTimer seconds={exercise.restSeconds} onDone={() => setRest(false)} />}
  </section>;
}

function EditableNumber({ ariaLabel, value, onCommit }: { ariaLabel: string; value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <input aria-label={ariaLabel} type="text" inputMode="numeric" pattern="[0-9]*" value={draft} onFocus={(event) => event.currentTarget.select()} onChange={(event) => { const next = event.target.value.replace(/[^0-9]/g, ''); setDraft(next); if (next !== '') onCommit(commitNumericDraft(next, { fallback: value, min: 0 })); }} onBlur={() => { const next = commitNumericDraft(draft, { fallback: value, min: 0 }); setDraft(String(next)); onCommit(next); }} />;
}

export function ExerciseMedia({ exercise }: { exercise: GuidedExercise }) {
  const[urls,setUrls]=useState<string[]>(exercise.media.url?[exercise.media.url]:[]);
  useEffect(()=>{if(!exercise.media.mediaId){setUrls(exercise.media.url?[exercise.media.url]:[]);return;}let active=true;let created:string[]=[];getExerciseMedia(exercise.media.mediaId).then((record)=>{if(!active||!record)return;created=mediaObjectUrls(record);setUrls(created)});return()=>{active=false;created.forEach(URL.revokeObjectURL)}},[exercise.media.mediaId,exercise.media.url]);
  if (exercise.media.type === 'none' || !urls.length) return <div className="atal-session-media is-empty"><ImageOff /><b>Sin recurso visual</b><small>Sigue las instrucciones escritas de tu fisioterapeuta.</small></div>;
  if (exercise.media.type === 'video') return <div className="atal-session-media"><video controls src={urls[0]} /></div>;
  if (exercise.media.type === 'animation') return <div className="atal-session-media"><img src={urls[0]} alt={`Animación de ${exercise.name}`} /></div>;
  if (exercise.media.type === 'sequence') return <div className="atal-session-media is-sequence">{urls.map((url,index)=><img key={url} src={url} alt={`Paso ${index+1} de ${exercise.name}`} />)}<TimerReset /></div>;
  return <div className="atal-session-media"><img src={urls[0]} alt={`Demostración de ${exercise.name}`} /></div>;
}
