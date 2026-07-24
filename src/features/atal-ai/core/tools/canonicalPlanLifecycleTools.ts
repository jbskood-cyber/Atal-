import { applyPlanLifecycle } from '../../../../domain/actions/planActions';
import type { PlanStatus } from '../../../../data/atalStore';
import { coreError, type EntityRef, type ToolDefinition, type ToolRisk } from '../contracts';

function planRef(input: unknown, replace = false) {
  if (!input || typeof input !== 'object') throw coreError('CORE_INPUT_INVALID', 'Selecciona un plan válido.');
  const value = input as Record<string, unknown>;
  const plan = value.plan as EntityRef;
  if (!plan || plan.type !== 'plan') throw coreError('CORE_INPUT_INVALID', 'Selecciona un plan válido.');
  if (replace && value.replaceCurrent !== true) throw coreError('CORE_INPUT_INVALID', 'Confirma el reemplazo del plan activo.');
  return replace ? { plan, replaceCurrent: true as const } : { plan };
}

function transitionTool(name: string, risk: ToolRisk, status: PlanStatus): ToolDefinition<any> {
  return {
    name,
    version: 1,
    risk,
    mutates: true,
    supportsUndo: true,
    undoTtlMs: 30_000,
    requiredEntities: ['plan'],
    validateInput: (input) => planRef(input),
    preconditions() {},
    execute(environment) {
      let eventIndex = 0;
      let notificationIndex = 0;
      let recordVersionIndex = 0;
      const result = applyPlanLifecycle(environment.state, {
        planId: environment.resolved.plan!.id,
        status,
        now: environment.context.now,
        createEventId: () => `${environment.transactionId}-event-${eventIndex++}`,
        createNotificationId: () => `${environment.transactionId}-notification-${notificationIndex++}`,
        createRecordVersionId: () => `${environment.transactionId}-record-version-${recordVersionIndex++}`,
      });
      return {
        status: 'success',
        message: `Plan “${result.plan.title}” actualizado a ${result.plan.status}.`,
        summary: [`${result.plan.title}: ${result.plan.status}.`],
        data: { patientId: result.plan.patientId, planId: result.plan.id },
        href: `/plans/${result.plan.id}`,
        affected: [{ type: 'plan', id: result.plan.id }],
      };
    },
  };
}

const replaceActiveTool: ToolDefinition<any> = {
  name: 'plan.replace_active',
  version: 1,
  risk: 'sensitive-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: ['patient', 'plan'],
  validateInput: (input) => planRef(input, true),
  preconditions(environment) {
    const target = environment.state.plans.find((plan) => plan.id === environment.resolved.plan?.id);
    if (!target) throw coreError('CORE_PRECONDITION_FAILED', 'El plan seleccionado ya no existe.');
    if (target.patientId !== environment.resolved.patient?.id) throw coreError('CORE_PRECONDITION_FAILED', 'El plan no pertenece al paciente seleccionado.');
    if (!environment.state.plans.some((plan) => plan.patientId === target.patientId && plan.status === 'active' && plan.id !== target.id)) {
      throw coreError('CORE_PRECONDITION_FAILED', 'No hay otro plan activo que reemplazar.');
    }
  },
  execute(environment) {
    let eventIndex = 0;
    let notificationIndex = 0;
    let recordVersionIndex = 0;
    const result = applyPlanLifecycle(environment.state, {
      planId: environment.resolved.plan!.id,
      status: 'active',
      resolveActiveConflict: 'pause',
      now: environment.context.now,
      createEventId: () => `${environment.transactionId}-event-${eventIndex++}`,
      createNotificationId: () => `${environment.transactionId}-notification-${notificationIndex++}`,
      createRecordVersionId: () => `${environment.transactionId}-record-version-${recordVersionIndex++}`,
    });
    return {
      status: 'success',
      message: `Plan “${result.plan.title}” activado y “${result.replacedPlan?.title ?? 'el plan anterior'}” pausado.`,
      summary: [`${result.replacedPlan?.title ?? 'Plan anterior'}: pausado.`, `${result.plan.title}: activo.`],
      data: { patientId: result.plan.patientId, planId: result.plan.id, replacedPlanId: result.replacedPlan?.id },
      href: `/plans/${result.plan.id}`,
      affected: [
        ...(result.replacedPlan ? [{ type: 'plan' as const, id: result.replacedPlan.id }] : []),
        { type: 'plan' as const, id: result.plan.id },
      ],
    };
  },
};

export const canonicalPlanLifecycleTools: ToolDefinition<any>[] = [
  transitionTool('plan.activate', 'sensitive-write', 'active'),
  transitionTool('plan.pause', 'reversible-write', 'paused'),
  transitionTool('plan.complete', 'sensitive-write', 'completed'),
  transitionTool('plan.archive', 'sensitive-write', 'archived'),
  transitionTool('plan.restore', 'reversible-write', 'draft'),
  replaceActiveTool,
];

export const canonicalPlanLifecycleToolNames = new Set(canonicalPlanLifecycleTools.map((tool) => tool.name));
