'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Clock3, ImagePlus, Repeat2, Video } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { createLocalExercise, deleteExercise, updateLocalExercise, type ExerciseMedia } from '@/src/data/localExercises';
import { saveExerciseMedia } from '@/src/data/exerciseMediaRepository';

type ExecutionMode = 'repetitions' | 'time' | 'both';
type MediaKind = ExerciseMedia['type'];

export function NewExerciseScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<ExecutionMode>('repetitions');
  const [media, setMedia] = useState<MediaKind>('none');
  const [saved, setSaved] = useState(false);
  const [files,setFiles]=useState<File[]>([]);
  const [error,setError]=useState('');
  const [preview,setPreview]=useState('');
  useEffect(()=>{if(!files[0]){setPreview('');return;}const url=URL.createObjectURL(files[0]);setPreview(url);return()=>URL.revokeObjectURL(url);},[files]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    const number = (key: string, fallback: number) => {
      const parsed = Number(form.get(key));
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    if(media!=='none'&&!files.length){setError('Selecciona el recurso visual antes de guardar.');return;}
    let exercise:ReturnType<typeof createLocalExercise>|null=null;
    try{exercise=createLocalExercise({
      name,
      region: text('region'),
      category: text('category'),
      objective: text('objective'),
      startingPosition: text('startingPosition'),
      instructions: text('instructions').split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      precautions: text('precautions'),
      equipment: text('equipment'),
      difficulty: text('difficulty'),
      sets: Math.max(1, number('sets', 3)),
      repetitions: mode === 'time' ? undefined : Math.max(1, number('repetitions', 10)),
      time: mode === 'repetitions' ? undefined : text('time'),
      rest: text('rest'),
      maxPain: Math.min(10, Math.max(0, number('maxPain', 3))),
      tags: text('tags').split(',').map((tag) => tag.trim()).filter(Boolean),
      notes: text('notes'),
      media: { type: 'none' },
    });
    if(media!=='none'){const record=await saveExerciseMedia(exercise.id,media==='video'?'video':media==='sequence'?'sequence':'image',files);updateLocalExercise(exercise.id,{media:{type:media,mediaId:record.id}});}
    setSaved(true);
    window.setTimeout(() => router.push(`/exercises/${exercise?.id}`), 450);
    }catch(problem){if(exercise)try{deleteExercise(exercise.id);}catch{}setError(problem instanceof Error?problem.message:'No pudimos guardar el ejercicio.');}
  };

  return <AtalShell><main className="atal-content atal-flow-page atal-new-exercise-page">
    <div className="atal-flow-topbar"><button type="button" aria-label="Volver" onClick={() => router.back()}><ArrowLeft /></button><span>Nuevo ejercicio</span><i /></div>
    <div className="atal-form-heading"><h1>Crear ejercicio</h1><p>Construye una guía totalmente personalizada para tu biblioteca local.</p></div>
    <form className="atal-clinical-form atal-exercise-form" onSubmit={submit}>
      <fieldset><legend>Información clínica</legend>
        <div className="atal-field-grid is-balanced"><label className="atal-field"><span>Nombre</span><input required name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Marcha lateral con banda" /></label><label className="atal-field"><span>Región corporal</span><input name="region" placeholder="Escribe cualquier región" /></label></div>
        <div className="atal-field-grid is-balanced"><label className="atal-field"><span>Categoría</span><input name="category" placeholder="Ej. control motor" /></label><label className="atal-field"><span>Objetivo</span><input name="objective" placeholder="Ej. mejorar estabilidad" /></label></div>
        <label className="atal-field"><span>Posición inicial</span><textarea name="startingPosition" placeholder="Describe cómo debe colocarse el paciente…" /></label>
        <label className="atal-field"><span>Instrucciones</span><textarea required name="instructions" placeholder="Un paso por línea. Ej. Mantén el tronco estable…" /></label>
        <label className="atal-field"><span>Precauciones</span><textarea name="precautions" placeholder="Señales para detener o adaptar el ejercicio…" /></label>
      </fieldset>

      <fieldset><legend>Prescripción</legend>
        <div className="atal-mode-switch" role="group" aria-label="Tipo de ejercicio"><button type="button" className={mode === 'repetitions' ? 'is-active' : ''} onClick={() => setMode('repetitions')}><Repeat2 /> Repeticiones</button><button type="button" className={mode === 'time' ? 'is-active' : ''} onClick={() => setMode('time')}><Clock3 /> Tiempo</button><button type="button" className={mode === 'both' ? 'is-active' : ''} onClick={() => setMode('both')}>Ambos</button></div>
        <div className="atal-prescription-fields"><label className="atal-field"><span>Series</span><input name="sets" inputMode="numeric" type="number" min="1" defaultValue="3" /></label>{mode !== 'time' && <label className="atal-field"><span>Repeticiones</span><input name="repetitions" inputMode="numeric" type="number" min="1" defaultValue="10" /></label>}{mode !== 'repetitions' && <label className="atal-field"><span>Tiempo</span><input name="time" placeholder="Ej. 45 segundos" /></label>}<label className="atal-field"><span>Descanso</span><input name="rest" placeholder="Ej. 30 segundos" /></label><label className="atal-field"><span>Dolor máximo permitido</span><input name="maxPain" inputMode="numeric" type="number" min="0" max="10" defaultValue="3" /></label></div>
        <div className="atal-field-grid is-balanced"><label className="atal-field"><span>Equipo o material</span><input name="equipment" placeholder="Ej. banda elástica o ninguno" /></label><label className="atal-field"><span>Dificultad</span><input name="difficulty" placeholder="Escribe el nivel o adaptación" /></label></div>
      </fieldset>

      <fieldset><legend>Organización y recurso visual</legend>
        <label className="atal-field"><span>Etiquetas</span><input name="tags" placeholder="Separadas por comas; acepta texto libre" /></label>
        <label className="atal-field"><span>Observaciones</span><textarea name="notes" placeholder="Indicaciones adicionales para el fisioterapeuta…" /></label>
        <div className="atal-media-picker" role="group" aria-label="Recurso visual local">{([{ id: 'image', label: 'Imagen', icon: <ImagePlus /> }, { id: 'video', label: 'Video', icon: <Video /> }, { id: 'sequence', label: 'Secuencia', icon: <ImagePlus /> }, { id: 'none', label: 'Sin recurso', icon: <Check /> }] as const).map((item) => <button type="button" key={item.id} className={media === item.id ? 'is-active' : ''} onClick={() => {setMedia(item.id);setFiles([]);setError('');}}>{item.icon}<span>{item.label}</span></button>)}</div>
        {media !== 'none' && <label className="atal-exercise-media"><ImagePlus/><span><b>{files.length?`${files.length} archivo(s) seleccionado(s)`:'Seleccionar recurso local'}</b><small>{media==='video'?'Video corto, máximo 25 MB':media==='sequence'?'Hasta 12 imágenes de 8 MB':'Imagen de hasta 8 MB'}</small></span><input type="file" accept={media==='video'?'video/*':'image/*'} multiple={media==='sequence'} onChange={(event)=>{setFiles(Array.from(event.target.files??[]));setError('');}}/></label>}
        {preview&&<div className="atal-media-preview">{media==='video'?<video src={preview} controls/>:<img src={preview} alt="Vista previa del recurso"/>}<button type="button" onClick={()=>setFiles([])}>Eliminar recurso</button></div>}
      </fieldset>
      {error&&<p className="atal-form-error" role="alert">{error}</p>}
      <button type="submit" className="atal-submit-button" disabled={!name.trim()}><Check />{saved ? 'Ejercicio guardado' : 'Guardar ejercicio local'}</button>
    </form>
  </main></AtalShell>;
}
