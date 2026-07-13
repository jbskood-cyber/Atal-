import { useEffect, useRef } from 'react';
import { AlertCircle, Clock3, Dumbbell, RotateCcw, X } from 'lucide-react';
import { ExerciseMedia } from './ActiveExercise';
import type { GuidedExercise } from './types';

export function ExercisePreviewDialog({ exercise, onClose }: { exercise: GuidedExercise; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { window.removeEventListener('keydown', closeOnEscape); previous?.focus(); };
  }, [onClose]);

  return <div className="atal-exercise-preview-dialog" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="atal-exercise-preview-title" tabIndex={-1}>
      <header><div><span>Vista previa del ejercicio</span><h2 id="atal-exercise-preview-title">{exercise.name}</h2></div><button type="button" aria-label="Cerrar vista previa" onClick={onClose}><X /></button></header>
      <div className="atal-preview-scroll"><ExerciseMedia exercise={exercise} /><div className="atal-preview-heading"><span>{exercise.region}</span><p>{exercise.objective}</p></div>
        <div className="atal-exercise-prescription"><span><Dumbbell /><b>{exercise.sets}</b><small>series</small></span><span><RotateCcw /><b>{exercise.repetitions ?? `${exercise.seconds ?? 0}s`}</b><small>{exercise.repetitions ? 'repeticiones' : 'por serie'}</small></span><span><Clock3 /><b>{exercise.restSeconds}s</b><small>descanso</small></span><span><AlertCircle /><b>{exercise.maxPain}/10</b><small>dolor máximo</small></span></div>
        <div className="atal-exercise-instructions"><article><b>Material</b><p>{exercise.equipment}</p></article><article><b>Posición inicial</b><p>{exercise.startingPosition}</p></article><article><b>Cómo hacerlo</b><ol>{exercise.instructions.map((instruction, index) => <li key={`${instruction}-${index}`}>{instruction}</li>)}</ol></article><article className="is-caution"><b>Precauciones</b><p>{exercise.precautions}</p></article><blockquote>{exercise.therapistCue}</blockquote></div>
      </div><button type="button" className="atal-session-primary" onClick={onClose}>Cerrar</button>
    </section>
  </div>;
}
