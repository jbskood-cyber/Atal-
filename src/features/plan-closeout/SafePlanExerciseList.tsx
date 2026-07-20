'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Pencil, Trash2, Undo2 } from 'lucide-react';
import { duplicateExercise, useExerciseCatalog } from '@/src/data/localExercises';
import { ExerciseMediaThumbnail } from '@/src/components/atal/ExerciseMediaThumbnail';

type MenuPosition = { top: number; left: number };

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
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ id: string; index: number } | null>(null);
  const menuExercise = menuId ? catalog.find((item) => item.id === menuId) : null;
  const confirmExercise = confirmId ? catalog.find((item) => item.id === confirmId) : null;

  const closeMenu = () => {
    setMenuId(null);
    setMenuPosition(null);
  };

  useEffect(() => {
    if (!menuId) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('pointerdown', closeMenu);
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('pointerdown', closeMenu);
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [menuId]);

  useEffect(() => {
    if (!confirmId) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmId(null);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [confirmId]);

  const toggleMenu = (id: string, anchor: HTMLButtonElement) => {
    if (menuId === id) {
      closeMenu();
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menuWidth = 216;
    const menuHeight = 150;
    const viewportPadding = 12;
    const gap = 8;
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );
    const preferredTop = rect.top >= menuHeight + viewportPadding + gap
      ? rect.top - menuHeight - gap
      : rect.bottom + gap;
    const top = Math.min(
      Math.max(viewportPadding, preferredTop),
      window.innerHeight - menuHeight - viewportPadding,
    );

    setMenuPosition({ top, left });
    setMenuId(id);
  };

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
    closeMenu();
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
                  onClick={(event) => toggleMenu(id, event.currentTarget)}
                >
                  <MoreHorizontal />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {menuId && menuExercise && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          className="atal-exercise-context-menu"
          role="menu"
          aria-label={`Acciones para ${menuExercise.name}`}
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" onClick={() => { closeMenu(); router.push(`/exercises/${menuExercise.id}`); }}>
            <Pencil />
            <span>Ver y editar</span>
          </button>
          <button type="button" role="menuitem" onClick={duplicate}>
            <Copy />
            <span>Duplicar</span>
          </button>
          <button type="button" role="menuitem" className="is-danger" onClick={() => { const id = menuExercise.id; closeMenu(); setConfirmId(id); }}>
            <Trash2 />
            <span>Quitar del plan</span>
          </button>
        </div>,
        document.body,
      )}

      {removed && (
        <div className="atal-undo-toast" role="status">
          <span>Ejercicio quitado del plan.</span>
          <button type="button" onClick={undo}><Undo2 />Deshacer</button>
        </div>
      )}

      {confirmId && typeof document !== 'undefined' && createPortal(
        <div className="atal-exercise-confirm-backdrop" onMouseDown={() => setConfirmId(null)}>
          <section
            className="atal-exercise-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="atal-exercise-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="atal-exercise-confirm-icon"><Trash2 /></span>
            <div className="atal-exercise-confirm-copy">
              <h2 id="atal-exercise-confirm-title">¿Quitar {confirmExercise?.name ?? 'este ejercicio'}?</h2>
              <p>Se quitará de este plan, pero seguirá disponible en la biblioteca de ejercicios.</p>
            </div>
            <div className="atal-exercise-confirm-actions">
              <button type="button" autoFocus onClick={() => setConfirmId(null)}>Cancelar</button>
              <button type="button" className="is-danger" onClick={remove}><Trash2 />Quitar del plan</button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
