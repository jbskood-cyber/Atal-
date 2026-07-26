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
  label?: string;
  parent?: ContextualEntityReference;
};

const COMMON_READ_TOOLS = new Set([
  'app.read',
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

const READ_RESOURCES_BY_SURFACE: Record<ContextualAgentSurface, ReadonlySet<string>> = {
  patient: new Set(['patient_profile', 'clinical_record', 'clinical_record_versions', 'plans', 'session_preparation', 'sessions', 'activity']),
  'clinical-record': new Set(['patient_profile', 'clinical_record', 'clinical_record_versions']),
  plan: new Set(['patient_profile', 'plan', 'exercises', 'session_preparation', 'sessions', 'activity', 'delivery']),
  exercise: new Set(['exercise', 'exercises']),
  report: new Set(['report', 'patient_profile', 'plan', 'sessions', 'activity']),
};

const READ_ANCHORS: Record<string, ReadonlyArray<'patient' | 'plan' | 'exercise' | 'session'>> = {
  patient_profile: ['patient'],
  clinical_record: ['patient'],
  clinical_record_versions: ['patient'],
  plans: ['patient'],
  plan: ['plan'],
  session_preparation: ['patient'],
  sessions: ['patient', 'plan'],
  report: ['session'],
  activity: ['patient'],
  exercise: ['exercise'],
  delivery: ['plan'],
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

function collectReferences(references: ContextualEntityReference[]): ContextualEntityReference[] {
  const collected: ContextualEntityReference[] = [];
  const visit = (reference: ContextualEntityReference) => {
    if (reference.parent) visit(reference.parent);
    collected.push(reference);
  };
  references.forEach(visit);
  return collected;
}

function appReadResource(input: unknown): string {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return '';
  const resource = (input as Record<string, unknown>).resource;
  return typeof resource === 'string' ? resource.trim() : '';
}

function hasMatchingAnchor(
  context: ContextualExecutionBoundary,
  references: ContextualEntityReference[],
  anchorTypes: ReadonlyArray<'patient' | 'plan' | 'exercise' | 'session'>,
): boolean {
  return references.some((reference) => {
    if (!anchorTypes.includes(reference.type as 'patient' | 'plan' | 'exercise' | 'session')) return false;
    const expected = expectedId(context, reference.type);
    return Boolean(expected && reference.id?.trim() && reference.id === expected);
  });
}

function contextualReadViolation(
  context: ContextualExecutionBoundary,
  surface: ContextualAgentSurface,
  references: ContextualEntityReference[],
  input: unknown,
): string | null {
  const resource = appReadResource(input);
  if (!resource || !READ_RESOURCES_BY_SURFACE[surface].has(resource)) {
    return 'La consulta contextual debe permanecer dentro del objeto fijado por esta pantalla.';
  }
  const anchors = READ_ANCHORS[resource] ?? [];
  if (anchors.length && !hasMatchingAnchor(context, references, anchors)) {
    return 'La consulta contextual debe permanecer dentro del objeto fijado por esta pantalla.';
  }
  return null;
}

export function contextualInvocationViolation(
  context: ContextualExecutionBoundary,
  tool: string,
  references: ContextualEntityReference[],
  input?: unknown,
): string | null {
  if (context.assistantScope !== 'contextual') return null;
  const surface = context.contextSurface;
  if (!surface || !isContextualToolAllowed(surface, tool)) {
    return 'Esa acción no está disponible desde este contexto.';
  }

  const collectedReferences = collectReferences(references);
  for (const reference of collectedReferences) {
    const expected = expectedId(context, reference.type);
    if (!expected) continue;
    if (reference.id?.trim() && reference.id !== expected) {
      return `La acción intentó usar un ${entityLabel(reference.type)} diferente al contexto actual.`;
    }
    if (!reference.id?.trim() && reference.label?.trim()) {
      return `La acción contextual debe usar el ${entityLabel(reference.type)} fijado por esta pantalla.`;
    }
  }

  if (tool === 'app.read') return contextualReadViolation(context, surface, collectedReferences, input);
  return null;
}
