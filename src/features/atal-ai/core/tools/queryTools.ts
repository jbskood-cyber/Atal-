import { coreError, type EntityRef, type ToolDefinition } from '../contracts';
import { normalizeEntityLabel } from '../stableValue';

function recordInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw coreError('CORE_INPUT_INVALID', 'Los datos de la consulta no son válidos.');
  return input as Record<string, unknown>;
}

function entityRef(value: unknown, type: EntityRef['type']): EntityRef {
  if (!value || typeof value !== 'object' || (value as EntityRef).type !== type) {
    throw coreError('CORE_INPUT_INVALID', `Falta una referencia válida de tipo ${type}.`);
  }
  return value as EntityRef;
}

export const queryTools: ToolDefinition[] = [
  {
    name: 'patient.search',
    version: 1,
    risk: 'read',
    mutates: false,
    supportsUndo: false,
    requiredEntities: [],
    validateInput(input) {
      const value = recordInput(input);
      const query = typeof value.query === 'string' ? value.query.trim() : '';
      if (!query) throw coreError('CORE_INPUT_INVALID', 'Escribe un criterio para buscar pacientes.');
      return { query };
    },
    preconditions() {},
    execute(environment, input) {
      const { query } = input as { query: string };
      const normalized = normalizeEntityLabel(query);
      const matches = environment.state.patients
        .filter((patient) => normalizeEntityLabel(`${patient.name} ${patient.diagnosis} ${patient.affectedArea}`).includes(normalized))
        .slice(0, 5)
        .map((patient) => ({ id: patient.id, name: patient.name, diagnosis: patient.diagnosis, status: patient.status }));
      return {
        status: 'success',
        message: matches.length ? `Encontré ${matches.length} pacientes.` : 'No encontré pacientes con ese criterio.',
        summary: matches.map((patient) => `${patient.name} — ${patient.diagnosis}`),
        data: { matches },
        affected: [],
      };
    },
  },
  {
    name: 'patient.summarize',
    version: 1,
    risk: 'read',
    mutates: false,
    supportsUndo: false,
    requiredEntities: ['patient'],
    validateInput(input) {
      const value = recordInput(input);
      return { patient: entityRef(value.patient, 'patient') };
    },
    preconditions() {},
    execute(environment) {
      const patient = environment.resolved.patient!;
      const record = environment.state.clinicalRecords
        .filter((item) => item.patientId === patient.id)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      const activePlan = environment.state.plans.find((item) => item.patientId === patient.id && item.status === 'active');
      const message = `${patient.name}. ${patient.diagnosis || 'Sin diagnóstico documentado'}. ${record?.evolution || 'Sin evolución documentada'}. ${activePlan ? `Plan activo: ${activePlan.title}.` : 'Sin plan activo.'}`;
      return {
        status: 'success',
        message,
        summary: [message],
        data: { patient, record, activePlan },
        href: `/patients/${patient.id}`,
        affected: [],
      };
    },
  },
  {
    name: 'session.summarize_recent',
    version: 1,
    risk: 'read',
    mutates: false,
    supportsUndo: false,
    requiredEntities: ['patient'],
    validateInput(input) {
      const value = recordInput(input);
      const limit = value.limit === undefined ? 3 : Number(value.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw coreError('CORE_INPUT_INVALID', 'El límite debe estar entre 1 y 10.');
      return { patient: entityRef(value.patient, 'patient'), limit };
    },
    preconditions() {},
    execute(environment, input) {
      const patient = environment.resolved.patient!;
      const { limit } = input as { limit: number };
      const sessions = environment.state.sessions
        .filter((session) => session.patientId === patient.id)
        .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
        .slice(0, limit);
      const averagePain = sessions.length
        ? Math.round((sessions.reduce((sum, session) => sum + session.endPain, 0) / sessions.length) * 10) / 10
        : null;
      const completed = sessions.filter((session) => session.status === 'completed').length;
      const message = sessions.length
        ? `${patient.name}: ${sessions.length} sesiones recientes, ${completed} completadas y dolor final promedio ${averagePain}/10.`
        : `${patient.name} todavía no tiene sesiones terminadas.`;
      return {
        status: 'success',
        message,
        summary: [message],
        data: { sessions, averagePain, completed },
        href: `/patients/${patient.id}`,
        affected: [],
      };
    },
  },
  {
    name: 'report.prepare_session_summary',
    version: 1,
    risk: 'read',
    mutates: false,
    supportsUndo: false,
    requiredEntities: [],
    validateInput(input) {
      const value = recordInput(input);
      const session = value.session ? entityRef(value.session, 'session') : undefined;
      const patient = value.patient ? entityRef(value.patient, 'patient') : undefined;
      if (!session && !patient) throw coreError('CORE_INPUT_INVALID', 'Selecciona una sesión o un paciente.');
      return { session, patient };
    },
    preconditions() {},
    execute(environment) {
      let session = environment.resolved.session;
      if (!session && environment.resolved.patient) {
        const eligible = environment.state.sessions.filter((item) => item.patientId === environment.resolved.patient?.id);
        if (eligible.length > 1) throw coreError('CORE_ENTITY_AMBIGUOUS', 'Selecciona la sesión que deseas resumir.');
        session = eligible[0];
      }
      if (!session) throw coreError('CORE_ENTITY_NOT_FOUND', 'No hay una sesión disponible para preparar el reporte.');
      const message = `Reporte listo: sesión ${session.status === 'completed' ? 'completada' : 'parcial'}, dolor ${session.startPain}/10 → ${session.endPain}/10, esfuerzo ${session.effort}/5 y duración aproximada ${session.durationMinutes} minutos.`;
      return {
        status: 'success',
        message,
        summary: [message],
        data: { session },
        href: `/activity/${session.id}`,
        affected: [],
      };
    },
  },
];
