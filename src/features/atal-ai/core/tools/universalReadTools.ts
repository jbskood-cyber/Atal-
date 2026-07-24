import { coreError, type EntityRef, type ToolDefinition } from '../contracts';
import { normalizeEntityLabel } from '../stableValue';

export type AppReadResource =
  | 'patients'
  | 'patient_profile'
  | 'clinical_record'
  | 'clinical_record_versions'
  | 'plans'
  | 'plan'
  | 'exercises'
  | 'exercise'
  | 'session_preparation'
  | 'sessions'
  | 'report'
  | 'activity'
  | 'settings'
  | 'delivery';

export type AppReadInput = {
  resource: AppReadResource;
  query: string;
  status: string;
  limit: number;
  patient?: EntityRef;
  plan?: EntityRef;
  exercise?: EntityRef;
  session?: EntityRef;
};

const resources = new Set<AppReadResource>([
  'patients',
  'patient_profile',
  'clinical_record',
  'clinical_record_versions',
  'plans',
  'plan',
  'exercises',
  'exercise',
  'session_preparation',
  'sessions',
  'report',
  'activity',
  'settings',
  'delivery',
]);

function recordInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw coreError('CORE_INPUT_INVALID', 'La consulta universal no es válida.');
  }
  return input as Record<string, unknown>;
}

function optionalRef(value: unknown, type: EntityRef['type']): EntityRef | undefined {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== 'object' || (value as EntityRef).type !== type) {
    throw coreError('CORE_INPUT_INVALID', `La referencia ${type} no es válida.`);
  }
  const reference = value as EntityRef;
  if (!reference.id?.trim() && !reference.label?.trim()) {
    throw coreError('CORE_INPUT_INVALID', `La referencia ${type} necesita id o nombre.`);
  }
  return reference;
}

function boundedLimit(value: unknown): number {
  if (value === undefined) return 10;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw coreError('CORE_INPUT_INVALID', 'El límite debe estar entre 1 y 50.');
  }
  return limit;
}

function requireResolved<T>(value: T | undefined, label: string): T {
  if (!value) throw coreError('CORE_ENTITY_NOT_FOUND', `Falta identificar ${label}.`);
  return value;
}

function newestFirst<T extends { updatedAt?: string; createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((left, right) =>
    String(right.updatedAt ?? right.createdAt ?? '').localeCompare(String(left.updatedAt ?? left.createdAt ?? '')),
  );
}

function readTool(): ToolDefinition<AppReadInput> {
  return {
    name: 'app.read',
    version: 1,
    description: 'Consulta información mínima y canónica de pacientes, expedientes, planes, ejercicios, sesiones, actividad, ajustes o entrega.',
    risk: 'read',
    mutates: false,
    supportsUndo: false,
    requiredEntities: [],
    validateInput(input): AppReadInput {
      const value = recordInput(input);
      const resource = typeof value.resource === 'string' ? value.resource as AppReadResource : undefined;
      if (!resource || !resources.has(resource)) throw coreError('CORE_INPUT_INVALID', 'Selecciona un recurso de lectura compatible.');
      return {
        resource,
        query: typeof value.query === 'string' ? value.query.trim() : '',
        status: typeof value.status === 'string' ? value.status.trim() : '',
        limit: boundedLimit(value.limit),
        patient: optionalRef(value.patient, 'patient'),
        plan: optionalRef(value.plan, 'plan'),
        exercise: optionalRef(value.exercise, 'exercise'),
        session: optionalRef(value.session, 'session'),
      };
    },
    preconditions() {},
    execute(environment, input) {
      const { resource, query, status, limit } = input;
      const normalizedQuery = normalizeEntityLabel(query);

      if (resource === 'patients') {
        const matching = newestFirst(environment.state.patients.filter((item) =>
          (!status || item.status === status)
          && (!normalizedQuery || normalizeEntityLabel(`${item.name} ${item.diagnosis} ${item.affectedArea}`).includes(normalizedQuery)),
        ));
        const patients = matching.slice(0, limit);
        return {
          status: 'success',
          message: `Encontré ${matching.length} pacientes.`,
          summary: [`${matching.length} pacientes coinciden.`, ...patients.map((item) => `${item.name} · ${item.status}`)],
          data: { patients, total: matching.length },
          href: '/patients',
          affected: [],
        };
      }

      if (resource === 'patient_profile') {
        const patient = requireResolved(environment.resolved.patient, 'el paciente');
        const record = newestFirst(environment.state.clinicalRecords.filter((item) => item.patientId === patient.id))[0];
        const versions = newestFirst(environment.state.clinicalRecordVersions.filter((item) => item.patientId === patient.id)).slice(0, limit);
        const notes = newestFirst(environment.state.notes.filter((item) => item.patientId === patient.id)).slice(0, limit);
        const plans = newestFirst(environment.state.plans.filter((item) => item.patientId === patient.id)).slice(0, limit);
        const sessions = newestFirst(environment.state.sessions.filter((item) => item.patientId === patient.id)).slice(0, limit);
        return {
          status: 'success',
          message: `Perfil de ${patient.name} consultado.`,
          summary: [`Paciente: ${patient.name}.`, `${plans.length} planes y ${sessions.length} sesiones incluidas.`],
          data: { patient, record, versions, notes, plans, sessions },
          href: `/patients/${patient.id}`,
          affected: [],
        };
      }

      if (resource === 'clinical_record') {
        const patient = environment.resolved.patient;
        const record = environment.resolved.clinicalRecord
          ?? newestFirst(environment.state.clinicalRecords.filter((item) => !patient || item.patientId === patient.id))[0];
        if (!record) throw coreError('CORE_ENTITY_NOT_FOUND', 'No existe un expediente clínico para el contexto actual.');
        return {
          status: 'success', message: 'Expediente clínico consultado.', summary: [`Expediente versión ${record.version}.`],
          data: { record }, href: `/patients/${record.patientId}/clinical-record`, affected: [],
        };
      }

      if (resource === 'clinical_record_versions') {
        const patient = environment.resolved.patient;
        const record = environment.resolved.clinicalRecord;
        const versions = newestFirst(environment.state.clinicalRecordVersions
          .filter((item) => (!patient || item.patientId === patient.id) && (!record || item.recordId === record.id)))
          .slice(0, limit);
        return {
          status: 'success', message: `Encontré ${versions.length} versiones anteriores.`,
          summary: versions.map((item) => `Versión ${item.version} · ${item.createdAt}`), data: { versions }, affected: [],
        };
      }

      if (resource === 'plans') {
        const patient = environment.resolved.patient;
        const plans = newestFirst(environment.state.plans.filter((item) =>
          (!patient || item.patientId === patient.id)
          && (!status || item.status === status)
          && (!normalizedQuery || normalizeEntityLabel(`${item.title} ${item.focus} ${item.goal}`).includes(normalizedQuery)),
        )).slice(0, limit);
        return {
          status: 'success', message: `Encontré ${plans.length} planes.`,
          summary: plans.map((item) => `${item.title} · ${item.status}`), data: { plans }, href: '/plans', affected: [],
        };
      }

      if (resource === 'plan') {
        const plan = requireResolved(environment.resolved.plan, 'el plan');
        const patient = environment.state.patients.find((item) => item.id === plan.patientId);
        const exercises = plan.exerciseIds
          .map((id) => environment.state.exercises.find((item) => item.id === id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
        return {
          status: 'success', message: `Plan ${plan.title} consultado.`,
          summary: [`${plan.status}.`, `${exercises.length} ejercicios.`], data: { plan, patient, exercises },
          href: `/plans/${plan.id}`, affected: [],
        };
      }

      if (resource === 'exercises') {
        const exercises = newestFirst(environment.state.exercises.filter((item) =>
          (!status || item.status === status)
          && (!normalizedQuery || normalizeEntityLabel(`${item.name} ${item.region} ${item.category} ${item.objective} ${item.tags.join(' ')}`).includes(normalizedQuery)),
        )).slice(0, limit);
        return {
          status: 'success', message: `Encontré ${exercises.length} ejercicios.`,
          summary: exercises.map((item) => `${item.name} · ${item.region}`), data: { exercises }, href: '/exercises', affected: [],
        };
      }

      if (resource === 'exercise') {
        const exercise = requireResolved(environment.resolved.exercise, 'el ejercicio');
        const plans = environment.state.plans.filter((item) => item.exerciseIds.includes(exercise.id));
        return {
          status: 'success', message: `Ejercicio ${exercise.name} consultado.`,
          summary: [`${exercise.sets} series.`, `${plans.length} planes relacionados.`], data: { exercise, plans },
          href: `/exercises/${exercise.id}`, affected: [],
        };
      }

      if (resource === 'session_preparation') {
        const patient = requireResolved(environment.resolved.patient, 'el paciente');
        const plan = environment.resolved.plan
          ?? environment.state.plans.find((item) => item.patientId === patient.id && item.status === 'active');
        if (!plan) throw coreError('CORE_ENTITY_NOT_FOUND', 'El paciente no tiene un plan activo para preparar la sesión.');
        const exercises = plan.exerciseIds
          .map((id) => environment.state.exercises.find((item) => item.id === id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
        const previousSession = newestFirst(environment.state.sessions.filter((item) => item.patientId === patient.id && item.planId === plan.id))[0];
        return {
          status: 'success', message: `Sesión de ${patient.name} preparada.`,
          summary: [`Plan ${plan.title}.`, `${exercises.length} ejercicios.`], data: { patient, plan, exercises, previousSession },
          href: `/patients/${patient.id}/session`, affected: [],
        };
      }

      if (resource === 'sessions') {
        const patient = environment.resolved.patient;
        const plan = environment.resolved.plan;
        const sessions = newestFirst(environment.state.sessions.filter((item) =>
          (!patient || item.patientId === patient.id) && (!plan || item.planId === plan.id) && (!status || item.status === status),
        )).slice(0, limit);
        return {
          status: 'success', message: `Encontré ${sessions.length} sesiones.`,
          summary: sessions.map((item) => `${item.completedAt} · dolor ${item.endPain}/10 · ${item.status}`), data: { sessions }, affected: [],
        };
      }

      if (resource === 'report') {
        const session = requireResolved(environment.resolved.session, 'la sesión');
        const patient = environment.state.patients.find((item) => item.id === session.patientId);
        const plan = environment.state.plans.find((item) => item.id === session.planId);
        return {
          status: 'success', message: 'Reporte de sesión consultado.',
          summary: [`Dolor ${session.startPain}/10 → ${session.endPain}/10.`, `Esfuerzo ${session.effort}/5.`],
          data: { session, patient, plan }, href: `/activity/${session.id}`, affected: [],
        };
      }

      if (resource === 'activity') {
        const patient = environment.resolved.patient;
        const events = environment.state.events
          .filter((item) => (!patient || item.patientId === patient.id)
            && (!normalizedQuery || normalizeEntityLabel(`${item.title} ${item.detail} ${item.toolName ?? ''}`).includes(normalizedQuery)))
          .slice(0, limit);
        return {
          status: 'success', message: `Encontré ${events.length} eventos.`,
          summary: events.map((item) => `${item.title} · ${item.detail}`), data: { events }, href: '/activity', affected: [],
        };
      }

      if (resource === 'settings') {
        const settings = environment.state.settings;
        return {
          status: 'success', message: 'Preferencias consultadas.',
          summary: [`Perfil: ${settings.professionalName || 'sin nombre'}.`, `Sugerencias IA: ${settings.aiSuggestions ? 'activadas' : 'desactivadas'}.`],
          data: { settings }, href: '/settings', affected: [],
        };
      }

      const plan = requireResolved(environment.resolved.plan, 'el plan');
      const patient = environment.state.patients.find((item) => item.id === plan.patientId);
      const exercises = plan.exerciseIds
        .map((id) => environment.state.exercises.find((item) => item.id === id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const sessions = newestFirst(environment.state.sessions.filter((item) => item.planId === plan.id)).slice(0, limit);
      return {
        status: 'success', message: 'Entrega del plan preparada para consulta.',
        summary: [`${patient?.name ?? 'Paciente'}.`, `${exercises.length} ejercicios.`, `${sessions.length} sesiones incluidas.`],
        data: { patient, plan, exercises, sessions }, href: `/plans/${plan.id}/delivery`, affected: [],
      };
    },
  };
}

export const universalReadTools: ToolDefinition[] = [readTool()];
