import type { AtalState } from '@/src/data/atalStore';
import type { ContextualAIContext } from './types';

export type ContextualAISuggestion = {
  id: string;
  title: string;
  reason: string;
  actionId: string;
};

type ContextState = Pick<AtalState, 'patients' | 'clinicalRecords' | 'plans' | 'exercises' | 'sessions'>;

function patientSuggestions(context: ContextualAIContext, state: ContextState): ContextualAISuggestion[] {
  const patient = state.patients.find((item) => item.id === context.patientId);
  if (!patient) return [];
  const result: ContextualAISuggestion[] = [];
  const missingContact = [
    !patient.contact.phone ? 'teléfono' : '',
    !patient.contact.email ? 'correo' : '',
    !patient.contact.emergencyContact ? 'contacto de emergencia' : '',
  ].filter(Boolean);
  if (missingContact.length) {
    result.push({
      id: 'missing-contact',
      title: 'Completar contacto',
      reason: `Faltan ${missingContact.join(', ')} en los datos guardados.`,
      actionId: 'update-contact',
    });
  }
  const record = state.clinicalRecords.find((item) => item.patientId === patient.id);
  if (!record) {
    result.push({
      id: 'initial-record-missing',
      title: 'Preparar valoración inicial',
      reason: 'No existe un expediente clínico guardado para este paciente.',
      actionId: 'complete-record',
    });
  } else {
    const missing = [!record.evolution ? 'evolución' : '', !record.providedDiagnosis ? 'diagnóstico proporcionado' : '', !record.goals.length ? 'objetivos' : ''].filter(Boolean);
    if (missing.length) {
      result.push({
        id: 'record-incomplete',
        title: 'Completar expediente',
        reason: `Faltan ${missing.join(', ')} en la versión ${record.version} del expediente.`,
        actionId: 'complete-record',
      });
    }
  }
  return result.slice(0, 2);
}

function recordSuggestions(context: ContextualAIContext, state: ContextState): ContextualAISuggestion[] {
  const record = state.clinicalRecords.find((item) => item.id === context.clinicalRecordId || item.patientId === context.patientId);
  if (!record) return [];
  const missing = [
    !record.evolution ? 'evolución' : '',
    !record.providedDiagnosis ? 'diagnóstico' : '',
    !record.functionalLimitations.length ? 'limitaciones funcionales' : '',
    !record.goals.length ? 'objetivos' : '',
  ].filter(Boolean);
  return missing.length ? [{
    id: 'record-incomplete',
    title: 'Hay datos clínicos por completar',
    reason: `La versión ${record.version} no tiene ${missing.join(', ')}.`,
    actionId: 'complete-record',
  }] : [];
}

function planSuggestions(context: ContextualAIContext, state: ContextState): ContextualAISuggestion[] {
  const plan = state.plans.find((item) => item.id === context.planId);
  if (!plan) return [];
  const result: ContextualAISuggestion[] = [];
  const missing = [!plan.goal ? 'objetivo' : '', !plan.duration ? 'duración' : '', !plan.frequency ? 'frecuencia' : '', !plan.progression ? 'progresión' : ''].filter(Boolean);
  if (missing.length) result.push({ id: 'plan-metadata-incomplete', title: 'Revisar estructura del plan', reason: `Faltan ${missing.join(', ')} en el plan guardado.`, actionId: 'review-plan' });
  if (!plan.exerciseIds.length) result.push({ id: 'plan-exercises-missing', title: 'Añadir ejercicios', reason: 'El plan guardado todavía no contiene ejercicios.', actionId: 'suggest-exercises' });
  return result.slice(0, 2);
}

function exerciseSuggestions(context: ContextualAIContext, state: ContextState): ContextualAISuggestion[] {
  const exercise = state.exercises.find((item) => item.id === context.exerciseId);
  if (!exercise) return [];
  const result: ContextualAISuggestion[] = [];
  if (!exercise.instructions.length) result.push({ id: 'exercise-instructions-missing', title: 'Completar instrucciones', reason: 'El ejercicio guardado no contiene instrucciones paso a paso.', actionId: 'review-instructions' });
  if (!exercise.precautions.trim()) result.push({ id: 'exercise-precautions-missing', title: 'Revisar precauciones', reason: 'El ejercicio guardado no contiene precauciones.', actionId: 'review-instructions' });
  return result.slice(0, 2);
}

function reportSuggestions(context: ContextualAIContext, state: ContextState): ContextualAISuggestion[] {
  const session = state.sessions.find((item) => item.id === context.sessionId || item.id === context.reportId);
  if (!session) return [];
  if (!session.clinicalObservation.trim()) return [{ id: 'report-observation-missing', title: 'Preparar observación clínica', reason: 'Este reporte no tiene una observación del fisioterapeuta guardada.', actionId: 'prepare-observation' }];
  return [];
}

export function contextualSuggestionsFor(context: ContextualAIContext, state: ContextState): ContextualAISuggestion[] {
  if (context.surface === 'patient') return patientSuggestions(context, state);
  if (context.surface === 'clinical-record') return recordSuggestions(context, state);
  if (context.surface === 'plan') return planSuggestions(context, state);
  if (context.surface === 'exercise') return exerciseSuggestions(context, state);
  return reportSuggestions(context, state);
}
