'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Pencil, Trash2, Undo2 } from 'lucide-react';
import { duplicateExercise, useExerciseCatalog } from '@/src/data/localExercises';
import { ExerciseMediaThumbnail } from '@/src/components/atal/ExerciseMediaThumbnail';

export function SafePlanExerciseList({
  exerciseIds,
  onChange,
  onMessage,
}: {
  exerciseIds: string[];
  onChange: (ids: string[]) => void;
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const catalog = useExerciseCatalog();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ id: string; index: number } | null>(null);
  const menuExercise = menuId ? catalog.find((item) => item.id === menuId) : null;

  useEffect(() => {
    if (!menuId) return;

    const closeMenu = () => setMenuId(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('pointerdown', closeMenu);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuId]);

  const move = (index: number, direction: -1 | 1) => {
    const next = [...exerciseIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const duplicate = () => {
    if (!menuId) return;
    const index = exerciseIds.indexOf(menuId);
    const copy = duplicateExercise(menuId);
    const next = [...exerciseIds];
    next.splice(index + 1, 0, copy.id);
    onChange(next);
    setMenuId(null);
    onMessage('Ejercicio duplicado en el plan.');
  };

  const remove = () => {
    if (!confirmId) return;
    const index = exerciseIds.indexOf(confirmId);
    const name = catalog.find((item) => item.id === confirmId)?.name ?? 'Ejercicio';
    if (index < 0) {
      setConfirmId(null);
      return;
    }
    onChange(exerciseIds.filter((id) => id !== confirmId));
    setRemoved({ id: confirmId, index });
    setConfirmId(null);
    onMessage(`${name} se quitó del plan.`);
  };

  const undo = () => {
    if (!removed) return;
    const next = [...exerciseIds];
    next.splice(Math.min(removed.index, next.length), 0, removed.id);
    onChange(next);
    setRemoved(null);
    onMessage('Ejercicio restaurado.');
  };

  return (
    <>
      <div className="atal-plan-exercises atal-plan-exercises--safe">
        {exerciseIds.map((id, index) => {
          const exercise = catalog.find((item) => item.id === id);
          if (!exercise) return null;
          const menuOpen = menuId === id && menuExercise?.id === id;

          return (
            <div className="atal-plan-exercise-row" key={id}>
              <ExerciseMediaThumbnail mediaId={exercise.details.media.mediaId} name={exercise.name} />
              <span className="atal-plan-exercise-copy">
                <b>{exercise.name}</b>
                <small>{exercise.details.sets} series · {exercise.details.repetitions ?? exercise.details.time ?? 'Por definir'}</small>
              </span>
              <div className="atal-plan-exercise-controls">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Subir ${exercise.name}`}>
                  <ArrowUp />
                </button>
                <button type="button" disabled={index === exerciseIds.length - 1} onClick={() => move(index, 1)} aria-label={`Bajar ${exercise.name}`}>
                  <ArrowDown />
                </button>
                <button
                  type="button"
                  aria-label={`Más opciones para ${exercise.name}`}
                  aria-expanded={menuOpen}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setMenuId((current) => current === id ? null : id)}
                >
                  <MoreHorizontal />
                </button>
              </div>
              {menuOpen && (
                <div
                  className="atal-exercise-context-menu"
                  role="menu"
                  aria-label={`Acciones para ${exercise.name}`}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <button type="button" role="menuitem" onClick={() => { setMenuId(null); router.push(`/exercises/${exercise.id}`); }}>
                    <Pencil />
                    <span>Ver y editar</span>
                  </button>
                  <button type="button" role="menuitem" onClick={duplicate}>
                    <Copy />
                    <span>Duplicar</span>
                  </button>
                  <button type="button" role="menuitem" className="is-danger" onClick={() => { setMenuId(null); setConfirmId(exercise.id); }}>
                    <Trash2 />
                    <span>Quitar del plan</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {removed && (
        <div className="atal-undo-toast" role="status">
          <span>Ejercicio quitado del plan.</span>
          <button type="button" onClick={undo}><Undo2 />Deshacer</button>
        </div>
      )}

      {confirmId && (
        <div className="atal-overlay" onMouseDown={() => setConfirmId(null)}>
          <section className="atal-native-sheet" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header><h2>¿Quitar {catalog.find((item) => item.id === confirmId)?.name ?? 'este ejercicio'}?</h2></header>
            <p>Se quitará de este plan, pero seguirá disponible en la biblioteca de ejercicios.</p>
            <button type="button" className="atal-submit-button is-danger" onClick={remove}>Quitar del plan</button>
            <button type="button" onClick={() => setConfirmId(null)}>Cancelar</button>
          </section>
        </div>
      )}
    </>
  );
}
