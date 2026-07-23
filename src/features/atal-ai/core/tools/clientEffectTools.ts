import { coreError, type EntityRef, type ToolDefinition } from '../contracts';

function objectInput(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw coreError('CORE_INPUT_INVALID', message);
  return input as Record<string, unknown>;
}

function ref(value: unknown, type: EntityRef['type']): EntityRef {
  if (!value || typeof value !== 'object' || (value as EntityRef).type !== type) throw coreError('CORE_INPUT_INVALID', `Selecciona una referencia ${type} válida.`);
  return value as EntityRef;
}

function text(value: unknown, max = 500): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw coreError('CORE_INPUT_INVALID', 'Uno de los textos no es válido.');
  const normalized = value.trim();
  if (normalized.length > max) throw coreError('CORE_INPUT_INVALID', `El texto supera ${max} caracteres.`);
  return normalized;
}

function bounded(value: unknown, min: number, max: number, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw coreError('CORE_INPUT_INVALID', `El valor debe estar entre ${min} y ${max}.`);
  return parsed;
}

function stringList(value: unknown, max = 12): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw coreError('CORE_INPUT_INVALID', 'La lista de archivos no es válida.');
  const values = [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  if (!values.length || values.length > max) throw coreError('CORE_INPUT_INVALID', `Selecciona entre 1 y ${max} archivos.`);
  return values;
}

function routeFor(value: Record<string, unknown>): string {
  const route = text(value.route, 500) ?? '';
  if (!route.startsWith('/')) throw coreError('CORE_INPUT_INVALID', 'La ruta solicitada no es válida.');
  const allowed = /^\/(?:$|patients(?:\/[^/]+(?:\/(?:clinical-record|portal-preview|session))?)?|plans(?:\/[^/]+(?:\/delivery)?)?|exercises(?:\/[^/]+)?|activity(?:\/[^/]+)?|exports|settings(?:\/(?:profile|privacy|ai|appearance|feedback))?|assistant(?:\/drafts\/[^/]+)?|system-states)$/;
  if (!allowed.test(route)) throw coreError('CORE_EXTERNAL_BLOCKED', 'La ruta solicitada está fuera de Atal.');
  return route;
}

export const clientEffectTools: ToolDefinition<any>[] = [
  {
    name: 'navigation.open', version: 1, description: 'Abre una pantalla interna segura de Atal.',
    risk: 'read', mutates: false, supportsUndo: false, requiredEntities: [],
    validateInput(input) { const value = objectInput(input, 'La navegación no es válida.'); return { route: routeFor(value) }; },
    preconditions() {},
    execute(_environment, input) {
      return { status: 'success', message: 'Pantalla preparada.', summary: ['Navegación interna preparada.'], href: input.route, clientEffect: { type: 'navigate', href: input.route }, affected: [] };
    },
  },
  {
    name: 'settings.appearance', version: 1, description: 'Cambia el tema visual de Atal en este dispositivo.',
    risk: 'reversible-write', mutates: false, supportsUndo: false, requiredEntities: [],
    validateInput(input) {
      const value = objectInput(input, 'La apariencia solicitada no es válida.');
      if (value.mode !== 'light' && value.mode !== 'dark' && value.mode !== 'system') throw coreError('CORE_INPUT_INVALID', 'El tema debe ser claro, oscuro o sistema.');
      return { mode: value.mode };
    },
    preconditions() {},
    execute(_environment, input) {
      return { status: 'success', message: 'Apariencia actualizada.', summary: [`Tema: ${input.mode}.`], clientEffect: { type: 'theme', mode: input.mode }, affected: [] };
    },
  },
  {
    name: 'session.start_or_resume', version: 1, description: 'Crea o recupera el borrador de una sesión guiada y abre el flujo del paciente.',
    risk: 'reversible-write', mutates: false, supportsUndo: false, requiredEntities: ['patient', 'plan'],
    validateInput(input) {
      const value = objectInput(input, 'La preparación de la sesión no es válida.');
      return {
        patient: ref(value.patient, 'patient'), plan: ref(value.plan, 'plan'),
        startPain: bounded(value.startPain, 0, 10, 0), startEnergy: bounded(value.startEnergy, 0, 10, 5),
        comment: text(value.comment, 2_000) ?? '',
      };
    },
    preconditions(environment) {
      const plan = environment.resolved.plan!;
      if (plan.patientId !== environment.resolved.patient?.id) throw coreError('CORE_PRECONDITION_FAILED', 'El plan no pertenece al paciente.');
      if (plan.status !== 'active') throw coreError('CORE_PRECONDITION_FAILED', 'Solo se puede iniciar una sesión con un plan activo.');
    },
    execute(environment, input) {
      const patient = environment.resolved.patient!;
      const plan = environment.resolved.plan!;
      return {
        status: 'success', message: `Sesión de ${patient.name} preparada.`, summary: ['Sesión guiada preparada o recuperada.'],
        href: `/patients/${patient.id}/session`,
        clientEffect: { type: 'session-draft', operation: 'start', patientId: patient.id, planId: plan.id, draft: { startPain: input.startPain, startEnergy: input.startEnergy, comment: input.comment } },
        affected: [{ type: 'patient', id: patient.id }, { type: 'plan', id: plan.id }],
      };
    },
  },
  {
    name: 'session.update_draft', version: 1, description: 'Actualiza dolor, energía, esfuerzo, síntomas, comentarios o resultados del borrador de una sesión guiada.',
    risk: 'reversible-write', mutates: false, supportsUndo: false, requiredEntities: ['patient', 'plan'],
    validateInput(input) {
      const value = objectInput(input, 'La actualización de la sesión no es válida.');
      const patch = value.patch === undefined ? {} : objectInput(value.patch, 'Los datos de la sesión no son válidos.');
      return { patient: ref(value.patient, 'patient'), plan: ref(value.plan, 'plan'), patch };
    },
    preconditions(environment) {
      if (environment.resolved.plan?.patientId !== environment.resolved.patient?.id) throw coreError('CORE_PRECONDITION_FAILED', 'El plan no pertenece al paciente.');
    },
    execute(environment, input) {
      const patient = environment.resolved.patient!;
      const plan = environment.resolved.plan!;
      return {
        status: 'success', message: 'Progreso de la sesión actualizado.', summary: ['Borrador de sesión actualizado.'],
        href: `/patients/${patient.id}/session`,
        clientEffect: { type: 'session-draft', operation: 'update', patientId: patient.id, planId: plan.id, draft: input.patch },
        affected: [{ type: 'patient', id: patient.id }, { type: 'plan', id: plan.id }],
      };
    },
  },
  {
    name: 'session.complete', version: 1, description: 'Completa o guarda como parcial una sesión guiada existente.',
    risk: 'sensitive-write', mutates: false, supportsUndo: false, requiredEntities: ['patient', 'plan'],
    validateInput(input) {
      const value = objectInput(input, 'El cierre de la sesión no es válido.');
      const status = value.status === 'completed' ? 'completed' as const : 'partial' as const;
      const patch = value.patch === undefined ? {} : objectInput(value.patch, 'Los datos finales de la sesión no son válidos.');
      return { patient: ref(value.patient, 'patient'), plan: ref(value.plan, 'plan'), status, patch };
    },
    preconditions(environment) {
      if (environment.resolved.plan?.patientId !== environment.resolved.patient?.id) throw coreError('CORE_PRECONDITION_FAILED', 'El plan no pertenece al paciente.');
    },
    execute(environment, input) {
      const patient = environment.resolved.patient!;
      const plan = environment.resolved.plan!;
      return {
        status: 'success', message: `Sesión ${input.status === 'completed' ? 'completada' : 'guardada como parcial'}.`, summary: [`Sesión ${input.status}.`],
        href: `/activity`,
        clientEffect: { type: 'session-draft', operation: 'complete', patientId: patient.id, planId: plan.id, draft: { ...input.patch, status: input.status } },
        affected: [{ type: 'patient', id: patient.id }, { type: 'plan', id: plan.id }],
      };
    },
  },
  {
    name: 'exercise.media', version: 1, description: 'Vincula imágenes persistidas de Atal IA a un ejercicio tras una revisión compacta.',
    risk: 'reversible-write', mutates: false, supportsUndo: false, requiredEntities: ['exercise'],
    validateInput(input) {
      const value = objectInput(input, 'La multimedia del ejercicio no es válida.');
      const mediaType = value.mediaType === 'sequence' ? 'sequence' as const : 'image' as const;
      const artifactIds = stringList(value.artifactIds, mediaType === 'sequence' ? 12 : 1);
      if (mediaType === 'image' && artifactIds.length !== 1) throw coreError('CORE_INPUT_INVALID', 'Una imagen de ejercicio requiere un solo archivo.');
      return { exercise: ref(value.exercise, 'exercise'), mediaType, artifactIds };
    },
    preconditions() {},
    execute(environment, input) {
      const exercise = environment.resolved.exercise!;
      return {
        status: 'success', message: 'Multimedia del ejercicio preparada.', summary: ['Recurso visual listo para guardar localmente.'],
        href: `/exercises/${exercise.id}`,
        clientEffect: { type: 'exercise-media', exerciseId: exercise.id, mediaType: input.mediaType, artifactIds: input.artifactIds },
        affected: [{ type: 'exercise', id: exercise.id }],
      };
    },
  },
  {
    name: 'delivery.open', version: 1, description: 'Abre la previsualización de entrega de un plan.',
    risk: 'read', mutates: false, supportsUndo: false, requiredEntities: ['plan'],
    validateInput(input) { const value = objectInput(input, 'La entrega no es válida.'); return { plan: ref(value.plan, 'plan') }; },
    preconditions() {},
    execute(environment) {
      const plan = environment.resolved.plan!;
      const href = `/plans/${plan.id}/delivery`;
      return { status: 'success', message: 'Entrega preparada.', summary: ['Previsualización de entrega abierta.'], href, clientEffect: { type: 'delivery', action: 'open', planId: plan.id }, affected: [] };
    },
  },
  {
    name: 'delivery.action', version: 1, description: 'Genera, descarga, comparte o imprime localmente la entrega de un plan.',
    risk: 'sensitive-write', mutates: false, supportsUndo: false, requiredEntities: ['plan'],
    validateInput(input) {
      const value = objectInput(input, 'La acción de entrega no es válida.');
      if (value.action !== 'download' && value.action !== 'share' && value.action !== 'print') throw coreError('CORE_INPUT_INVALID', 'La acción debe ser descargar, compartir o imprimir.');
      const options = value.options && typeof value.options === 'object' && !Array.isArray(value.options) ? value.options as Record<string, unknown> : undefined;
      return { plan: ref(value.plan, 'plan'), action: value.action, options };
    },
    preconditions() {},
    execute(environment, input) {
      const plan = environment.resolved.plan!;
      return { status: 'success', message: 'Acción de entrega preparada.', summary: [`Entrega: ${input.action}.`], href: `/plans/${plan.id}/delivery`, clientEffect: { type: 'delivery', action: input.action, planId: plan.id, options: input.options }, affected: [] };
    },
  },
];
