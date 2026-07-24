export type ContextualAgentSurface = 'patient' | 'clinical-record' | 'plan' | 'exercise' | 'report';

export type ContextualExecutionBoundary = {
  assistantScope?: 'global' | 'contextual';
  contextSurface?: ContextualAgentSurface;
  selectedPatientId: string;
  selectedPlanId: string;
  selectedExerciseId: string;
  selectedSessionId: string;
};

export type ContextualEntityReference = {
  type: string;
  id?: string;
};

const COMMON_READ_TOOLS = new Set([
  'app.read',
  'navigation.open',
]);

const TOOLS_BY_SURFACE: Record<ContextualAgentSurface, ReadonlySet<string>> = {
  patient: new Set([
    ...COMMON_READ_TOOLS,
    'patient.search',
    'patient.summarize',
    'session.summarize_recent',
    'report.prepare_session_summary',
    'patient.update',
    'patient.lifecycle',
    'patient_note.add',
    'patient_note.update',
    'clinical_record.upsert',
    'plan.create_simple',
    'session.start_or_resume',
    'session.update_draft',
    'session.complete',
  ]),
  'clinical-record': new Set([
    ...COMMON_READ_TOOLS,
    'patient.summarize',
    'session.summarize_recent',
    'patient_note.add',
    'patient_note.update',
    'clinical_record.upsert',
  ]),
  plan: new Set([
    ...COMMON_READ_TOOLS,
    'patient.summarize',
    'session.summarize_recent',
    'plan.update_fields',
    'plan.duplicate',
    'plan.membership',
    'plan.activate',
    'plan.pause',
    'plan.complete',
    'plan.archive',
    'plan.restore',
    'exercise.create_simple',
    'exercise.update_fields',
    'session.start_or_resume',
    'session.update_draft',
    'session.complete',
    'delivery.open',
    'delivery.action',
  ]),
  exercise: new Set([
    ...COMMON_READ_TOOLS,
    'exercise.update_fields',
    'exercise.duplicate',
    'exercise.lifecycle',
    'exercise.media',
  ]),
  report: new Set([
    ...COMMON_READ_TOOLS,
    'report.prepare_session_summary',
    'report.review',
  ]),
};

export function isContextualToolAllowed(surface: ContextualAgentSurface, tool: string): boolean {
  return TOOLS_BY_SURFACE[surface].has(tool);
}

function expectedId(context: ContextualExecutionBoundary, type: string): string {
  if (type === 'patient') return context.selectedPatientId;
  if (type === 'plan') return context.selectedPlanId;
  if (type === 'exercise') return context.selectedExerciseId;
  if (type === 'session') return context.selectedSessionId;
  return '';
}

function entityLabel(type: string): string {
  if (type === 'patient') return 'paciente';
  if (type === 'plan') return 'plan';
  if (type === 'exercise') return 'ejercicio';
  if (type === 'session') return 'sesión';
  return 'entidad';
}

export function contextualInvocationViolation(
  context: ContextualExecutionBoundary,
  tool: string,
  references: ContextualEntityReference[],
): string | null {
  if (context.assistantScope !== 'contextual') return null;
  const surface = context.contextSurface;
  if (!surface || !isContextualToolAllowed(surface, tool)) {
    return 'Esa acción no está disponible desde este contexto.';
  }

  for (const reference of references) {
    if (!reference.id?.trim()) continue;
    const expected = expectedId(context, reference.type);
    if (expected && reference.id !== expected) {
      return `La acción intentó usar un ${entityLabel(reference.type)} diferente al contexto actual.`;
    }
  }
  return null;
}
