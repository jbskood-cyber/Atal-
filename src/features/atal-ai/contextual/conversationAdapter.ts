import type { AIWorkContext, AtalAIIntent } from '../types';
import { contextualAIContextKey } from './stateMachine';
import type { ContextualAIContext } from './types';

export function contextualConversationKey(context: ContextualAIContext) {
  return `contextual:${contextualAIContextKey(context)}`;
}

function defaultIntent(context: ContextualAIContext): AtalAIIntent {
  if (context.surface === 'patient') return 'summarize_patient';
  if (context.surface === 'clinical-record') return 'update_patient_record';
  if (context.surface === 'plan') return 'update_existing_plan';
  if (context.surface === 'exercise') return 'update_existing_exercise';
  return 'summarize_sessions';
}

export function workContextForContext(
  context: ContextualAIContext,
  intent: AtalAIIntent = defaultIntent(context),
): AIWorkContext {
  return {
    intent,
    patientMode: context.patientId ? 'existing' : 'none',
    selectedPatientId: context.patientId,
    selectedPlanId: context.planId,
    selectedExerciseId: context.exerciseId,
  };
}
