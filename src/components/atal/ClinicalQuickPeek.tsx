'use client';

import { useEffect, useRef } from 'react';
import { keepDialogTabFocus } from './dialogKeyboard';
import { ArrowLeft, ArrowUpRight, CalendarDays, ClipboardList, Eye, FileText, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { usePatientCatalog } from '@/src/data/localPatients';
import { useLocalPlans } from '@/src/data/localPlans';

export type ClinicalPeekTarget = { kind: 'patient' | 'plan'; id: string };

const patientStatus = {
  active: 'Activo',
  attention: 'Requiere atención',
  archived: 'Archivado',
} as const;
const planStatus = {
  active: 'Activo',
  draft: 'Borrador',
  paused: 'Pausado',
  completed: 'Completado',
  archived: 'Archivado',
} as const;

/**
 * Read-only clinical summary. This is NOT the editor/record and has no
 * mutations, permissions shortcuts, or AI operations. It reuses the actual
 * Atal patient and plan stores rather than maintaining another copy.
 *
 * In command search: embedded in the existing dialog, avoiding nested modals.
 * In directories: a modal side panel that leaves underlying filters intact.
 */
export function ClinicalQuickPeek({
  target, onClose, onOpenDetail, inline = false,
}: {
  target: ClinicalPeekTarget;
  onClose: () => void;
  onOpenDetail: () => void;
  inline?: boolean;
}) {
  const patients = usePatientCatalog();
  const plans = useLocalPlans();
  const backRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const touchStartY = useRef<number | null>(null);
  const patient = target.kind === 'patient' ? patients.find((item) => item.id === target.id) : undefined;
  const plan = target.kind === 'plan' ? plans.find((item) => item.id === target.id) : undefined;
  const relatedPatient = plan ? patients.find((item) => item.id === plan.patientId) : undefined;
  const activePlans = patient ? plans.filter((item) => item.patientId === patient.id && item.status === 'active') : [];
  const name = patient?.name ?? plan?.title ?? 'Elemento no disponible';

  useEffect(() => {
    backRef.current?.focus();
    if (inline) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [inline]);

  const content = (
    <section ref={panelRef} className="atal-clinical-peek" role={inline ? 'region' : 'dialog'}
      tabIndex={-1} aria-modal={inline ? undefined : true} aria-label={`Vista rápida: ${name}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        } else if (!inline && panelRef.current) {
          keepDialogTabFocus(event, panelRef.current);
        }
      }}>
      <div className="atal-clinical-peek__drag-handle" aria-hidden="true"
        onTouchStart={(event) => { touchStartY.current = event.touches[0]?.clientY ?? null; }}
        onTouchEnd={(event) => {
          const start = touchStartY.current;
          touchStartY.current = null;
          if (!inline && start !== null && event.changedTouches[0]?.clientY - start > 72) onClose();
        }}>
        <span />
      </div>
      <header className="atal-clinical-peek__bar">
        <button ref={backRef} type="button" aria-label={inline ? 'Volver a resultados' : 'Cerrar vista rápida'} onClick={onClose}>
          {inline ? <ArrowLeft aria-hidden="true" /> : <X aria-hidden="true" />}
          <span>{inline ? 'Resultados' : 'Cerrar'}</span>
        </button>
        <span><Eye size={14} aria-hidden="true" /> Vista rápida · Solo lectura</span>
      </header>
      {(patient || plan) ? <>
        <div className="atal-clinical-peek__identity">
          {patient ? <Avatar name={patient.name} size="lg" /> : <span className="atal-clinical-peek__plan-icon"><ClipboardList aria-hidden="true" /></span>}
          <div>
            <p className="atal-clinical-peek__eyebrow">{patient ? 'Paciente' : 'Plan de tratamiento'}</p>
            <h2>{name}</h2>
            <span className="atal-clinical-peek__status">{patient ? patientStatus[patient.status] : plan ? planStatus[plan.status] : ''}</span>
          </div>
        </div>
        {patient ? <>
          <div className="atal-clinical-peek__facts">
            <div><small>Motivo / diagnóstico</small><strong>{patient.diagnosis || 'Sin registrar'}</strong></div>
            <div><small>Zona afectada</small><strong>{patient.affectedArea || 'Sin registrar'}</strong></div>
            <div><small>Progreso registrado</small><strong>{patient.progress}%</strong></div>
            <div><small>Planes activos</small><strong>{activePlans.length}</strong></div>
          </div>
          {activePlans.length > 0 && <div className="atal-clinical-peek__related">
            <CalendarDays aria-hidden="true" /><span>Plan activo: <strong>{activePlans[0].title}</strong></span>
          </div>}
        </> : plan ? <>
          <div className="atal-clinical-peek__facts">
            <div><small>Paciente</small><strong>{relatedPatient?.name ?? 'Paciente no disponible'}</strong></div>
            <div><small>Duración</small><strong>{plan.duration || 'Sin definir'}</strong></div>
            <div><small>Frecuencia</small><strong>{plan.frequency || 'Sin definir'}</strong></div>
            <div><small>Ejercicios asignados</small><strong>{plan.exerciseIds.length}</strong></div>
          </div>
          {plan.goal && <div className="atal-clinical-peek__related">
            <FileText aria-hidden="true" /><span>Objetivo: <strong>{plan.goal}</strong></span>
          </div>}
        </> : null}
        <div className="atal-clinical-peek__actions">
          <button type="button" className="is-primary" onClick={onOpenDetail}>
            {patient ? 'Abrir expediente completo' : 'Abrir plan completo'}
            <ArrowUpRight aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose}>Volver sin perder filtros</button>
        </div>
      </> : <div className="atal-clinical-peek__missing">
        <p>El elemento ya no está disponible.</p>
        <button type="button" onClick={onClose}>Volver a resultados</button>
      </div>}
    </section>
  );
  return inline ? content : (
    <div className="atal-clinical-peek__backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      {content}
    </div>
  );
}
