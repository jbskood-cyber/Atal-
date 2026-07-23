import type {
  AppSettings,
  AtalState,
  ExerciseEntity,
  PatientEntity,
  PlanEntity,
  SessionRecord,
} from '@/src/data/atalStore';
import type { ClinicalRecord } from '@/src/features/clinical-record/types';
import type {
  ClarificationRequest,
  EntityRef,
  EntityType,
  ExecutionContext,
  ResolutionResult,
  ResolvedEntities,
  ToolInvocation,
} from './contracts';
import { normalizeEntityLabel } from './stableValue';

type EntityValue = PatientEntity | PlanEntity | ExerciseEntity | SessionRecord | ClinicalRecord | AppSettings;
type Candidate = { id: string; label: string; value: EntityValue };

const RESOLUTION_ORDER: EntityType[] = [
  'patient',
  'plan',
  'exercise',
  'session',
  'clinical-record',
  'settings',
];

function clarification(
  code: ClarificationRequest['code'],
  message: string,
  entityType?: EntityType,
  candidates?: Candidate[],
): ResolutionResult {
  return {
    status: 'clarification',
    clarification: {
      code,
      message,
      entityType,
      candidates: candidates?.map(({ id, label }) => ({ id, label })),
    },
  };
}

function candidatesFor(state: AtalState, type: EntityType, resolved: ResolvedEntities): Candidate[] {
  switch (type) {
    case 'patient':
      return state.patients.map((value) => ({ id: value.id, label: value.name, value }));
    case 'plan': {
      const plans = resolved.patient
        ? state.plans.filter((value) => value.patientId === resolved.patient?.id)
        : state.plans;
      return plans.map((value) => ({ id: value.id, label: value.title, value }));
    }
    case 'exercise':
      return state.exercises.map((value) => ({
        id: value.id,
        label: `${value.name} · ${value.region}`,
        value,
      }));
    case 'session': {
      const sessions = state.sessions.filter((value) =>
        (!resolved.patient || value.patientId === resolved.patient.id)
        && (!resolved.plan || value.planId === resolved.plan.id));
      return sessions.map((value) => ({ id: value.id, label: value.startedAt, value }));
    }
    case 'clinical-record': {
      const records = resolved.patient
        ? state.clinicalRecords.filter((value) => value.patientId === resolved.patient?.id)
        : state.clinicalRecords;
      return records.map((value) => ({ id: value.id, label: value.reasonForVisit || value.date || value.id, value }));
    }
    case 'settings':
      return [{ id: 'settings', label: 'Ajustes', value: state.settings }];
  }
}

function exactLabel(candidate: Candidate, type: EntityType): string {
  if (type === 'exercise') return normalizeEntityLabel((candidate.value as ExerciseEntity).name);
  return normalizeEntityLabel(candidate.label);
}

function contextId(type: EntityType, context: ExecutionContext): string {
  switch (type) {
    case 'patient': return context.selectedPatientId;
    case 'plan': return context.selectedPlanId;
    case 'exercise': return context.selectedExerciseId;
    case 'session': return context.selectedSessionId;
    default: return '';
  }
}

function assignResolved(resolved: ResolvedEntities, type: EntityType, value: EntityValue): void {
  switch (type) {
    case 'patient': resolved.patient = value as PatientEntity; break;
    case 'plan': resolved.plan = value as PlanEntity; break;
    case 'exercise': resolved.exercise = value as ExerciseEntity; break;
    case 'session': resolved.session = value as SessionRecord; break;
    case 'clinical-record': resolved.clinicalRecord = value as ClinicalRecord; break;
    case 'settings': resolved.settings = value as AppSettings; break;
  }
}

function collectReferences(references: EntityRef[]): Map<EntityType, EntityRef> | ClarificationRequest {
  const collected = new Map<EntityType, EntityRef>();

  function collect(reference: EntityRef): ClarificationRequest | undefined {
    if (reference.parent) {
      const parentError = collect(reference.parent);
      if (parentError) return parentError;
    }
    const existing = collected.get(reference.type);
    if (existing && (existing.id !== reference.id || existing.label !== reference.label)) {
      return {
        code: 'INPUT_INVALID',
        message: `La propuesta contiene más de una referencia de tipo ${reference.type}.`,
        entityType: reference.type,
      };
    }
    collected.set(reference.type, reference);
    return undefined;
  }

  for (const reference of references) {
    const error = collect(reference);
    if (error) return error;
  }
  return collected;
}

function relationshipError(resolved: ResolvedEntities): ResolutionResult | undefined {
  if (resolved.patient && resolved.plan && resolved.plan.patientId !== resolved.patient.id) {
    return clarification('ENTITY_RELATION_INVALID', 'El plan no pertenece al paciente seleccionado.', 'plan');
  }
  if (resolved.patient && resolved.clinicalRecord && resolved.clinicalRecord.patientId !== resolved.patient.id) {
    return clarification('ENTITY_RELATION_INVALID', 'El expediente no pertenece al paciente seleccionado.', 'clinical-record');
  }
  if (resolved.plan && resolved.clinicalRecord && resolved.clinicalRecord.planId
      && resolved.clinicalRecord.planId !== resolved.plan.id) {
    return clarification('ENTITY_RELATION_INVALID', 'El expediente no está asociado con el plan seleccionado.', 'clinical-record');
  }
  if (resolved.patient && resolved.session && resolved.session.patientId !== resolved.patient.id) {
    return clarification('ENTITY_RELATION_INVALID', 'La sesión no pertenece al paciente seleccionado.', 'session');
  }
  if (resolved.plan && resolved.session && resolved.session.planId !== resolved.plan.id) {
    return clarification('ENTITY_RELATION_INVALID', 'La sesión no pertenece al plan seleccionado.', 'session');
  }
  return undefined;
}

export function resolveEntities(
  state: AtalState,
  invocation: ToolInvocation,
  context: ExecutionContext,
): ResolutionResult {
  const collected = collectReferences(invocation.references);
  if (!(collected instanceof Map)) {
    return { status: 'clarification', clarification: collected };
  }

  const resolved: ResolvedEntities = {};

  for (const type of RESOLUTION_ORDER) {
    const reference = collected.get(type);
    if (!reference) continue;

    const allCandidates = candidatesFor(state, type, resolved);
    let selected: Candidate | undefined;

    if (reference.id?.trim()) {
      selected = candidatesFor(state, type, {}).find((candidate) => candidate.id === reference.id);
      if (!selected) {
        return clarification('ENTITY_NOT_FOUND', `No se encontró la entidad ${type} indicada.`, type);
      }
    } else {
      const selectedId = contextId(type, context);
      if (selectedId) {
        selected = candidatesFor(state, type, {}).find((candidate) => candidate.id === selectedId);
        if (!selected) {
          return clarification('ENTITY_NOT_FOUND', `La entidad ${type} seleccionada ya no existe.`, type);
        }
      } else if (type === 'settings') {
        selected = allCandidates[0];
      } else if (reference.label?.trim()) {
        const normalized = normalizeEntityLabel(reference.label);
        const matches = allCandidates
          .filter((candidate) => exactLabel(candidate, type) === normalized)
          .sort((left, right) => left.id.localeCompare(right.id));
        if (matches.length > 1) {
          return clarification(
            'ENTITY_AMBIGUOUS',
            `Hay varias coincidencias exactas para ${reference.label}.`,
            type,
            matches,
          );
        }
        selected = matches[0];
      }
    }

    if (!selected) {
      return clarification('ENTITY_NOT_FOUND', `Falta identificar una entidad ${type}.`, type);
    }

    assignResolved(resolved, type, selected.value);
    const invalidRelationship = relationshipError(resolved);
    if (invalidRelationship) return invalidRelationship;
  }

  return { status: 'resolved', entities: resolved };
}
