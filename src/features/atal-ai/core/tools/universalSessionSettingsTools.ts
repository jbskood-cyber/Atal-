import { coreError, type EntityRef, type ToolDefinition } from '../contracts';

function objectInput(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw coreError('CORE_INPUT_INVALID', message);
  return input as Record<string, unknown>;
}

function ref(value: unknown, type: EntityRef['type']): EntityRef {
  if (!value || typeof value !== 'object' || (value as EntityRef).type !== type) throw coreError('CORE_INPUT_INVALID', `Selecciona una referencia ${type} válida.`);
  return value as EntityRef;
}

function text(value: unknown, max = 10_000): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw coreError('CORE_INPUT_INVALID', 'Uno de los textos no es válido.');
  const normalized = value.trim();
  if (normalized.length > max) throw coreError('CORE_INPUT_INVALID', `El texto supera ${max} caracteres.`);
  return normalized;
}

export const universalSessionSettingsTools: ToolDefinition[] = [
  {
    name: 'report.review', version: 1, description: 'Guarda la revisión u observación clínica del fisioterapeuta sobre una sesión.',
    risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: ['session'],
    validateInput(input) {
      const value = objectInput(input, 'La revisión del reporte no es válida.');
      const observation = text(value.observation) ?? '';
      if (!observation) throw coreError('CORE_INPUT_INVALID', 'Escribe la observación clínica.');
      return { session: ref(value.session, 'session'), observation };
    },
    preconditions(environment) {
      if (!environment.state.sessions.some((item) => item.id === environment.resolved.session?.id)) throw coreError('CORE_PRECONDITION_FAILED', 'La sesión ya no existe.');
    },
    execute(environment, input) {
      const session = environment.state.sessions.find((item) => item.id === environment.resolved.session?.id)!;
      session.clinicalObservation = input.observation;
      session.reviewedAt = environment.context.now;
      session.updatedAt = environment.context.now;
      environment.state.notifications = environment.state.notifications.map((item) => item.href === `/activity/${session.id}` ? { ...item, read: true } : item);
      return {
        status: 'success', message: 'Revisión clínica guardada.', summary: ['Reporte revisado.'],
        data: { sessionId: session.id, patientId: session.patientId, planId: session.planId }, href: `/activity/${session.id}`,
        affected: [{ type: 'session', id: session.id }],
      };
    },
  },
  {
    name: 'settings.profile_update', version: 1, description: 'Actualiza nombre profesional, especialidad o clínica.',
    risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: ['settings'],
    validateInput(input) {
      const value = objectInput(input, 'La actualización del perfil profesional no es válida.');
      const patch: { professionalName?: string; specialty?: string; clinic?: string } = {};
      const professionalName = text(value.professionalName, 180); if (professionalName !== undefined) patch.professionalName = professionalName;
      const specialty = text(value.specialty, 180); if (specialty !== undefined) patch.specialty = specialty;
      const clinic = text(value.clinic, 300); if (clinic !== undefined) patch.clinic = clinic;
      if (Object.keys(patch).length === 0) throw coreError('CORE_INPUT_INVALID', 'No se indicaron cambios para el perfil profesional.');
      return { settings: { type: 'settings', id: 'settings' } as EntityRef, patch };
    },
    preconditions() {},
    execute(environment, input) {
      Object.assign(environment.state.settings, input.patch);
      return { status: 'success', message: 'Perfil profesional actualizado.', summary: ['Perfil profesional actualizado.'], data: { settings: environment.state.settings }, href: '/settings/profile', affected: [{ type: 'settings', id: 'settings' }] };
    },
  },
];
