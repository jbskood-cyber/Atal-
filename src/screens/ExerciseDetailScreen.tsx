'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  Repeat2,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import {
  archiveLocalExercise,
  deleteExercise,
  duplicateExercise,
  restoreLocalExercise,
  updateLocalExercise,
  useExerciseCatalog,
} from '@/src/data/localExercises';
import { useAtalStore } from '@/src/data/atalStore';
import {
  deleteExerciseMedia,
  getExerciseMedia,
  mediaObjectUrls,
  saveExerciseMedia,
  type ExerciseMediaRecord,
} from '@/src/data/exerciseMediaRepository';

export function ExerciseDetailScreen({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const catalog = useExerciseCatalog(true);
  const linkedPlans = useAtalStore((state) => state.plans.filter((plan) => plan.exerciseIds.includes(exerciseId)));
  const item = catalog.find((entry) => entry.id === exerciseId);
  const exercise = item?.details;
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [media, setMedia] = useState<ExerciseMediaRecord | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    name: exercise?.name ?? '',
    region: exercise?.region ?? '',
    category: exercise?.category ?? '',
    objective: exercise?.objective ?? '',
    startingPosition: exercise?.startingPosition ?? '',
    instructions: exercise?.instructions.join('\n') ?? '',
    precautions: exercise?.precautions ?? '',
    equipment: exercise?.equipment ?? '',
    difficulty: exercise?.difficulty ?? '',
    sets: exercise?.sets?.toString() ?? '1',
    repetitions: exercise?.repetitions?.toString() ?? '',
    time: exercise?.time ?? '',
    rest: exercise?.rest ?? '',
    maxPain: exercise?.maxPain?.toString() ?? '',
    tags: exercise?.tags.join(', ') ?? '',
    notes: exercise?.notes ?? '',
  });

  useEffect(() => {
    if (!exercise?.media.mediaId) {
      setMedia(null);
      setUrls([]);
      return;
    }
    let active = true;
    getExerciseMedia(exercise.media.mediaId).then((record) => {
      if (active) setMedia(record);
    });
    return () => {
      active = false;
    };
  }, [exercise?.media.mediaId]);

  useEffect(() => {
    if (!media) {
      setUrls([]);
      return;
    }
    const next = mediaObjectUrls(media);
    setUrls(next);
    return () => next.forEach(URL.revokeObjectURL);
  }, [media]);

  useEffect(() => {
    if (!exercise) return;
    setForm({
      name: exercise.name,
      region: exercise.region,
      category: exercise.category,
      objective: exercise.objective,
      startingPosition: exercise.startingPosition,
      instructions: exercise.instructions.join('\n'),
      precautions: exercise.precautions,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      sets: String(exercise.sets),
      repetitions: exercise.repetitions?.toString() ?? '',
      time: exercise.time ?? '',
      rest: exercise.rest,
      maxPain: exercise.maxPain?.toString() ?? '',
      tags: exercise.tags.join(', '),
      notes: exercise.notes,
    });
  }, [exercise?.updatedAt]);

  if (!exercise) {
    return (
      <AtalShell>
        <main className="atal-content atal-flow-page">
          <div className="atal-panel-placeholder">
            <CircleAlert />
            <h1>Ejercicio no encontrado</h1>
            <p>El ejercicio solicitado no existe o fue eliminado.</p>
            <button type="button" onClick={() => router.push('/exercises')}>Volver</button>
          </div>
        </main>
      </AtalShell>
    );
  }

  const save = () => {
    updateLocalExercise(exercise.id, {
      name: form.name.trim(),
      region: form.region.trim(),
      category: form.category.trim(),
      objective: form.objective.trim(),
      startingPosition: form.startingPosition.trim(),
      instructions: form.instructions.split('\n').map((line) => line.trim()).filter(Boolean),
      precautions: form.precautions.trim(),
      equipment: form.equipment.trim(),
      difficulty: form.difficulty.trim(),
      sets: Math.max(1, Number(form.sets) || 1),
      repetitions: form.repetitions ? Number(form.repetitions) : undefined,
      time: form.time || undefined,
      rest: form.rest,
      maxPain: form.maxPain ? Number(form.maxPain) : null,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      notes: form.notes,
    });
    setEditing(false);
    setMessage('Cambios guardados.');
  };

  const replaceMedia = async (files: File[]) => {
    try {
      if (!files.length) return;
      const type = files[0].type.startsWith('video/') ? 'video' : files.length > 1 ? 'sequence' : 'image';
      const record = await saveExerciseMedia(exercise.id, type, files, media?.id);
      updateLocalExercise(exercise.id, { media: { type, mediaId: record.id } });
      setMedia(record);
      setMessage('Recurso actualizado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar el recurso.');
    }
  };

  const removeMedia = async () => {
    if (media) await deleteExerciseMedia(media.id);
    updateLocalExercise(exercise.id, { media: { type: 'none' } });
    setMedia(null);
    setMessage('Recurso eliminado.');
  };

  const duplicate = () => {
    const copy = duplicateExercise(exercise.id);
    setActionsOpen(false);
    router.push(`/exercises/${copy.id}`);
  };

  const toggleArchive = () => {
    if (exercise.status === 'archived') restoreLocalExercise(exercise.id);
    else archiveLocalExercise(exercise.id);
    setActionsOpen(false);
    setMessage(exercise.status === 'archived' ? 'Ejercicio restaurado.' : 'Ejercicio archivado.');
  };

  const confirmDelete = () => {
    if (linkedPlans.length) return;
    deleteExercise(exercise.id);
    if (media) void deleteExerciseMedia(media.id);
    router.push('/exercises');
  };

  return (
    <AtalShell>
      <main className="atal-content atal-flow-page">
        <div className="atal-flow-topbar">
          <button type="button" onClick={() => router.back()}><ArrowLeft /></button>
          <span>Detalle del ejercicio</span>
          <button type="button" onClick={() => setEditing((value) => !value)}><Pencil /></button>
        </div>

        {urls.length ? (
          <div className="atal-exercise-hero">
            {media?.type === 'video' ? <video src={urls[0]} controls /> : <img src={urls[0]} alt={exercise.name} />}
          </div>
        ) : (
          <div className="atal-exercise-hero atal-media-empty"><ImagePlus /><span>Sin recurso multimedia</span></div>
        )}

        {editing ? (
          <div className="atal-clinical-form">
            <fieldset>
              <legend>Editar ejercicio</legend>
              {Object.entries({
                name: 'Nombre',
                region: 'Región',
                category: 'Categoría',
                objective: 'Objetivo',
                startingPosition: 'Posición inicial',
                instructions: 'Instrucciones, una por línea',
                precautions: 'Precauciones',
                equipment: 'Material',
                difficulty: 'Dificultad',
                sets: 'Series',
                repetitions: 'Repeticiones',
                time: 'Tiempo',
                rest: 'Descanso',
                maxPain: 'Dolor máximo',
                tags: 'Etiquetas',
                notes: 'Observaciones',
              }).map(([key, label]) => (
                <label className="atal-field" key={key}>
                  <span>{label}</span>
                  {['objective', 'startingPosition', 'instructions', 'precautions', 'notes'].includes(key) ? (
                    <textarea value={form[key as keyof typeof form]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
                  ) : (
                    <input type={['sets', 'repetitions', 'maxPain'].includes(key) ? 'number' : 'text'} value={form[key as keyof typeof form]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
                  )}
                </label>
              ))}
            </fieldset>
            <label className="atal-exercise-media">
              <ImagePlus />
              <span><b>Reemplazar recurso</b><small>Imagen, video o varias imágenes</small></span>
              <input type="file" accept="image/*,video/*" multiple onChange={(event) => void replaceMedia(Array.from(event.target.files ?? []))} />
            </label>
            {media && <button type="button" onClick={() => void removeMedia()}><Trash2 />Eliminar recurso</button>}
            <button type="button" className="atal-submit-button" onClick={save}><Save />Guardar cambios</button>
          </div>
        ) : (
          <>
            <div className="atal-exercise-heading">
              <span>{exercise.region} · {exercise.category}</span>
              <h1>{exercise.name}</h1>
              <p>{exercise.objective || 'Objetivo por completar.'}</p>
            </div>
            <div className="atal-prescription-grid">
              <span><Repeat2 /><b>{exercise.sets} series</b><small>por sesión</small></span>
              <span><RotateCcw /><b>{exercise.repetitions ?? exercise.time ?? '—'}</b><small>objetivo</small></span>
              <span><Clock3 /><b>{exercise.rest || '—'}</b><small>descanso</small></span>
            </div>
            <section className="atal-instruction-card">
              <h2>Indicaciones</h2>
              <ol>{exercise.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
            </section>
            <div className="atal-clinical-cue">
              <CircleAlert />
              <span><b>Precauciones</b><small>{exercise.precautions || 'Sin precauciones registradas.'}</small></span>
            </div>
          </>
        )}

        <div className="atal-profile-actions atal-exercise-safe-actions">
          <button type="button" onClick={duplicate}><Copy />Duplicar</button>
          <button type="button" onClick={toggleArchive}>
            {exercise.status === 'archived' ? <RotateCcw /> : <Archive />}
            {exercise.status === 'archived' ? 'Restaurar' : 'Archivar'}
          </button>
        </div>
        <button type="button" className="atal-more-options-button" onClick={() => setActionsOpen(true)}>
          <MoreHorizontal />Más opciones<ChevronDown />
        </button>

        {linkedPlans.length > 0 && (
          <p className="atal-exercise-restriction" role="note">
            <CircleAlert />
            <span><b>Este ejercicio forma parte de {linkedPlans.length === 1 ? 'un plan' : `${linkedPlans.length} planes`}.</b><small>Archívalo para conservar el historial clínico.</small></span>
          </p>
        )}

        {message && <p className="atal-action-message" role="status"><Check />{message}</p>}

        {actionsOpen && (
          <div className="atal-command-dialog atal-exercise-actions-dialog" role="dialog" aria-modal="true" aria-labelledby="exercise-actions-title" onMouseDown={() => setActionsOpen(false)}>
            <section onMouseDown={(event) => event.stopPropagation()}>
              <header>
                <div><small>Ejercicio</small><h2 id="exercise-actions-title">Más opciones</h2></div>
                <button type="button" aria-label="Cerrar" onClick={() => setActionsOpen(false)}><X /></button>
              </header>
              <button type="button" onClick={() => { setEditing(true); setActionsOpen(false); }}><Pencil /><span><b>Editar ejercicio</b><small>Actualiza indicaciones y prescripción</small></span></button>
              <button type="button" onClick={duplicate}><Copy /><span><b>Duplicar ejercicio</b><small>Crea una copia independiente</small></span></button>
              <button type="button" onClick={toggleArchive}>{exercise.status === 'archived' ? <RotateCcw /> : <Archive />}<span><b>{exercise.status === 'archived' ? 'Restaurar ejercicio' : 'Archivar ejercicio'}</b><small>{exercise.status === 'archived' ? 'Vuelve a mostrarlo en la biblioteca' : 'Ocúltalo sin perder su historial'}</small></span></button>
              {linkedPlans.length === 0 ? (
                <button type="button" className="is-destructive" onClick={() => { setActionsOpen(false); setDeleteOpen(true); }}><Trash2 /><span><b>Eliminar ejercicio</b><small>Esta acción no se puede deshacer</small></span></button>
              ) : (
                <div className="atal-exercise-dialog-note"><CircleAlert /><p>No puede eliminarse mientras esté incluido en un plan. Puedes archivarlo.</p></div>
              )}
            </section>
          </div>
        )}

        {deleteOpen && (
          <div className="atal-command-dialog atal-exercise-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="exercise-delete-title" onMouseDown={() => setDeleteOpen(false)}>
            <section onMouseDown={(event) => event.stopPropagation()}>
              <Trash2 />
              <h2 id="exercise-delete-title">Eliminar ejercicio</h2>
              <p>Eliminarás <strong>“{exercise.name}”</strong> de la biblioteca. Esta acción no se puede deshacer.</p>
              <button type="button" onClick={() => setDeleteOpen(false)}>Cancelar</button>
              <button type="button" className="is-destructive" onClick={confirmDelete}>Eliminar ejercicio</button>
            </section>
          </div>
        )}
      </main>
    </AtalShell>
  );
}
