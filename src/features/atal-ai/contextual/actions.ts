import type { AtalState } from '@/src/data/atalStore';
import type { AtalAIIntent } from '../types';
import type { ContextualAIContext } from './types';

export type ContextualActionBehavior = 'query' | 'proposal';
export type ContextualActionPlacement = 'exterior' | 'internal';

export type ContextualAIAction = {
  id: string;
  label: string;
  prompt: string;
  intent: AtalAIIntent;
  behavior: ContextualActionBehavior;
};

type ContextState = Pick<AtalState, 'patients' | 'clinicalRecords' | 'plans' | 'exercises' | 'sessions'>;

const action = (
  id: string,
  label: string,
  prompt: string,
  intent: AtalAIIntent,
  behavior: ContextualActionBehavior,
): ContextualAIAction => ({ id, label, prompt, intent, behavior });

function patientActions(context: ContextualAIContext, state: ContextState) {
  const hasSessions = state.sessions.some((item) => item.patientId === context.patientId);
  const actions = [
    action('update-contact', 'Actualizar contacto', 'Ayúdame a preparar una actualización de los datos de contacto de este paciente. No apliques cambios todavía.', 'update_patient_record', 'proposal'),
    action('create-note', 'Crear nota', 'Ayúdame a preparar una nota clínica breve para este paciente. La revisaré antes de aplicarla.', 'add_patient_note', 'proposal'),
  ];
  if (hasSessions) actions.push(action('view-progress', 'Ver progreso', 'Resume la evolución y el progreso registrado de este paciente sin modificar datos.', 'summarize_sessions', 'query'));
  return actions;
}

function recordActions() {
  return [
    action('summarize-record', 'Resumir expediente', 'Resume este expediente clínico usando únicamente la información registrada. No modifiques datos.', 'summarize_patient', 'query'),
    action('complete-record', 'Completar datos', 'Identifica los campos faltantes de este expediente y prepara una actualización revisable. No la apliques todavía.', 'update_patient_record', 'proposal'),
    action('compare-evolution', 'Comparar evolución', 'Compara la evolución registrada con las sesiones disponibles de este paciente sin modificar datos.', 'summarize_sessions', 'query'),
  ];
}

function planActions(context: ContextualAIContext, state: ContextState) {
  const hasSessions = state.sessions.some((item) => item.planId === context.planId);
  const actions = [
    action('review-plan', 'Revisar plan', 'Revisa la estructura de este plan y prepara mejoras como borrador. No apliques cambios todavía.', 'update_existing_plan', 'proposal'),
    action('suggest-exercises', 'Sugerir ejercicios', 'Sugiere ejercicios apropiados para completar este plan usando el contexto registrado. Prepara un borrador revisable.', 'update_existing_plan', 'proposal'),
  ];
  if (hasSessions) actions.push(action('view-progress', 'Ver progreso', 'Resume el progreso real registrado para este plan sin modificar datos.', 'summarize_sessions', 'query'));
  else actions.push(action('view-progress', 'Ver progreso', 'Resume el estado actual de este plan y señala que todavía no hay sesiones registradas. No modifiques datos.', 'summarize_patient', 'query'));
  return actions;
}

function exerciseActions(context: ContextualAIContext) {
  const addPrompt = context.planId
    ? 'Prepara una propuesta para añadir este ejercicio al plan contextual actual. No apliques cambios todavía.'
    : 'Ayúdame a elegir un plan válido para este ejercicio y prepara una propuesta revisable. No apliques cambios todavía.';
  return [
    action('adapt-difficulty', 'Adaptar dificultad', 'Prepara una adaptación de dificultad y dosis para este ejercicio. Conserva precauciones y no apliques cambios todavía.', 'update_existing_exercise', 'proposal'),
    action('review-instructions', 'Revisar instrucciones', 'Revisa y mejora las instrucciones de este ejercicio como borrador. No apliques cambios todavía.', 'update_existing_exercise', 'proposal'),
    action('add-to-plan', 'Añadir al plan', addPrompt, 'update_existing_plan', 'proposal'),
  ];
}

function reportActions() {
  return [
    action('summarize-session', 'Resumir sesión', 'Resume esta sesión usando únicamente sus datos registrados. No modifiques datos.', 'create_report', 'query'),
    action('compare-evolution', 'Comparar evolución', 'Compara esta sesión con la evolución previa registrada del paciente. No modifiques datos.', 'summarize_sessions', 'query'),
    action('prepare-observation', 'Preparar observación', 'Prepara una observación clínica revisable para este reporte. No la apliques todavía.', 'create_report', 'proposal'),
  ];
}

export function contextualActionsFor(
  context: ContextualAIContext,
  state: ContextState,
  placement: ContextualActionPlacement,
): ContextualAIAction[] {
  let actions: ContextualAIAction[];
  if (context.surface === 'patient') actions = patientActions(context, state);
  else if (context.surface === 'clinical-record') actions = recordActions();
  else if (context.surface === 'plan') actions = planActions(context, state);
  else if (context.surface === 'exercise') actions = exerciseActions(context);
  else actions = reportActions();

  if (placement === 'internal') return actions.slice(0, 3);
  if (context.surface === 'patient') {
    const update = actions.find((item) => item.id === 'update-contact');
    const progress = actions.find((item) => item.id === 'view-progress');
    const note = actions.find((item) => item.id === 'create-note');
    return [update, progress ?? note].filter((item): item is ContextualAIAction => Boolean(item)).slice(0, 2);
  }
  return actions.slice(0, 2);
}
