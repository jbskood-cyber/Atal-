import { applyCreatePlan, applyPlanMembership, applyUpdatePlan } from '../../../../domain/actions/planActions';
import { coreError, type EntityRef, type ToolDefinition } from '../contracts';

function objectInput(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw coreError('CORE_INPUT_INVALID', message);
  return input as Record<string, unknown>;
}

function entityRef(value: unknown, type: EntityRef['type']): EntityRef {
  if (!value || typeof value !== 'object' || (value as EntityRef).type !== type) {
    throw coreError('CORE_INPUT_INVALID', `Selecciona una referencia ${type} válida.`);
  }
  const reference = value as EntityRef;
  if (!reference.id?.trim() && !reference.label?.trim()) throw coreError('CORE_INPUT_INVALID', `La referencia ${type} necesita id o nombre.`);
  return reference;
}

function optionalText(value: unknown, max = 5_000): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw coreError('CORE_INPUT_INVALID', 'Uno de los textos no es válido.');
  const normalized = value.trim();
  if (normalized.length > max) throw coreError('CORE_INPUT_INVALID', `El texto supera ${max} caracteres.`);
  return normalized;
}

function stringList(value: unknown, max = 100): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw coreError('CORE_INPUT_INVALID', 'La lista indicada no es válida.');
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))].slice(0, max);
}

type PlanCreateInput = {
  patient: EntityRef;
  title: string;
  focus: string;
  duration: string;
  frequency: string;
  goal: string;
  exerciseIds: string[];
  status: 'draft' | 'active';
  progression: string;
  reportCriteria: string;
  generalInstructions: string;
};

type PlanUpdateInput = {
  plan: EntityRef;
  patch: {
    title?: string;
    focus?: string;
    duration?: string;
    frequency?: string;
    goal?: string;
    progression?: string;
    reportCriteria?: string;
    generalInstructions?: string;
  };
};

type MembershipInput = { plan: EntityRef; operation: 'add' | 'remove' | 'reorder'; exerciseIds: string[] };

function validatePlanCreate(input: unknown): PlanCreateInput {
  const value = objectInput(input, 'Los datos del plan no son válidos.');
  const title = optionalText(value.title, 220) ?? '';
  if (!title) throw coreError('CORE_INPUT_INVALID', 'Añade un título al plan.');
  return {
    patient: entityRef(value.patient, 'patient'),
    title,
    focus: optionalText(value.focus) ?? '',
    duration: optionalText(value.duration, 120) ?? 'Por definir',
    frequency: optionalText(value.frequency, 120) ?? 'Por definir',
    goal: optionalText(value.goal) ?? '',
    exerciseIds: stringList(value.exerciseIds) ?? [],
    status: value.status === 'active' ? 'active' : 'draft',
    progression: optionalText(value.progression) ?? '',
    reportCriteria: optionalText(value.reportCriteria) ?? '',
    generalInstructions: optionalText(value.generalInstructions) ?? '',
  };
}

function validatePlanUpdate(input: unknown): PlanUpdateInput {
  const value = objectInput(input, 'La actualización del plan no es válida.');
  const raw = objectInput(value.patch, 'No se indicaron cambios para el plan.');
  const patch: PlanUpdateInput['patch'] = {};
  for (const key of ['title', 'focus', 'duration', 'frequency', 'goal', 'progression', 'reportCriteria', 'generalInstructions'] as const) {
    const next = optionalText(raw[key], key === 'title' ? 220 : 5_000);
    if (next !== undefined) patch[key] = next;
  }
  if (Object.keys(patch).length === 0) throw coreError('CORE_INPUT_INVALID', 'No se indicaron cambios para el plan.');
  return { plan: entityRef(value.plan, 'plan'), patch };
}

const planCreateTool: ToolDefinition<PlanCreateInput> = {
  name: 'plan.create_simple', version: 1, description: 'Crea un plan canónico para un paciente existente usando campos directos.',
  risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: ['patient'],
  validateInput: validatePlanCreate, preconditions() {},
  execute(environment, input) {
    const patientId = environment.resolved.patient!.id;
    let eventIndex = 0;
    let recordVersionIndex = 0;
    const result = applyCreatePlan(environment.state, {
      patientId,
      planId: `${environment.transactionId}-plan`,
      plan: {
        title: input.title, focus: input.focus, duration: input.duration, frequency: input.frequency, goal: input.goal,
        exerciseIds: input.exerciseIds, status: input.status, progression: input.progression,
        reportCriteria: input.reportCriteria, generalInstructions: input.generalInstructions,
      },
      now: environment.context.now,
      createEventId: () => `${environment.transactionId}-event-${eventIndex++}`,
      createRecordVersionId: () => `${environment.transactionId}-record-version-${recordVersionIndex++}`,
    });
    return {
      status: 'success', message: `Plan “${result.plan.title}” creado.`, summary: [`Plan creado como ${result.plan.status}.`],
      data: { patientId, planId: result.plan.id }, href: `/plans/${result.plan.id}`, affected: [{ type: 'plan', id: result.plan.id }],
    };
  },
};

const planUpdateTool: ToolDefinition<PlanUpdateInput> = {
  name: 'plan.update_fields', version: 1, description: 'Actualiza campos directos de un plan sin alterar su membresía de ejercicios.',
  risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: ['plan'],
  validateInput: validatePlanUpdate, preconditions() {},
  execute(environment, input) {
    let eventIndex = 0;
    let recordVersionIndex = 0;
    const result = applyUpdatePlan(environment.state, {
      planId: environment.resolved.plan!.id,
      patch: input.patch,
      now: environment.context.now,
      createEventId: () => `${environment.transactionId}-event-${eventIndex++}`,
      createRecordVersionId: () => `${environment.transactionId}-record-version-${recordVersionIndex++}`,
    });
    return {
      status: 'success', message: `Plan “${result.plan.title}” actualizado.`, summary: ['Datos del plan actualizados.'],
      data: { patientId: result.plan.patientId, planId: result.plan.id }, href: `/plans/${result.plan.id}`, affected: [{ type: 'plan', id: result.plan.id }],
    };
  },
};

const planMembershipTool: ToolDefinition<MembershipInput> = {
  name: 'plan.membership', version: 1, description: 'Añade, retira o reordena ejercicios de un plan.',
  risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000, requiredEntities: ['plan'],
  validateInput(input) {
    const value = objectInput(input, 'La membresía del plan no es válida.');
    const operation = value.operation;
    if (operation !== 'add' && operation !== 'remove' && operation !== 'reorder') throw coreError('CORE_INPUT_INVALID', 'Selecciona añadir, retirar o reordenar.');
    const exerciseIds = stringList(value.exerciseIds) ?? [];
    if (!exerciseIds.length) throw coreError('CORE_INPUT_INVALID', 'Indica al menos un ejercicio.');
    return { plan: entityRef(value.plan, 'plan'), operation, exerciseIds };
  },
  preconditions() {},
  execute(environment, input) {
    let eventIndex = 0;
    let recordVersionIndex = 0;
    const result = applyPlanMembership(environment.state, {
      planId: environment.resolved.plan!.id,
      operation: input.operation,
      exerciseIds: input.exerciseIds,
      now: environment.context.now,
      createEventId: () => `${environment.transactionId}-event-${eventIndex++}`,
      createRecordVersionId: () => `${environment.transactionId}-record-version-${recordVersionIndex++}`,
    });
    return {
      status: 'success', message: 'Ejercicios del plan actualizados.', summary: [`Membresía del plan: ${input.operation}.`],
      data: { patientId: result.plan.patientId, planId: result.plan.id, exerciseIds: result.plan.exerciseIds },
      href: `/plans/${result.plan.id}`, affected: [{ type: 'plan', id: result.plan.id }],
    };
  },
};

export const canonicalPlanTools: ToolDefinition<any>[] = [planCreateTool, planUpdateTool, planMembershipTool];
export const canonicalPlanToolNames = new Set(canonicalPlanTools.map((tool) => tool.name));
