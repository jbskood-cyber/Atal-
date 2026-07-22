import type { PlanEntity } from '@/src/data/atalStore';
import { coreError, type EntityRef, type ToolDefinition, type ToolRisk } from '../contracts';

type PlanInput = { plan: EntityRef; replaceCurrent?: true };

function validatePlanInput(input: unknown, replace = false): PlanInput {
  if (!input || typeof input !== 'object') throw coreError('CORE_INPUT_INVALID', 'Selecciona un plan válido.');
  const value = input as Record<string, unknown>;
  const plan = value.plan as EntityRef;
  if (!plan || plan.type !== 'plan') throw coreError('CORE_INPUT_INVALID', 'Selecciona un plan válido.');
  if (replace && value.replaceCurrent !== true) throw coreError('CORE_INPUT_INVALID', 'Confirma el reemplazo del plan activo.');
  return replace ? { plan, replaceCurrent: true } : { plan };
}

function currentPlan(environment: Parameters<ToolDefinition['preconditions']>[0]): PlanEntity {
  const plan = environment.state.plans.find((item) => item.id === environment.resolved.plan?.id);
  if (!plan) throw coreError('CORE_PRECONDITION_FAILED', 'El plan seleccionado ya no existe.');
  return plan;
}

function transitionTool(
  name: string,
  risk: ToolRisk,
  allowed: PlanEntity['status'][],
  nextStatus: PlanEntity['status'],
): ToolDefinition {
  return {
    name,
    version: 1,
    risk,
    mutates: true,
    supportsUndo: true,
    undoTtlMs: 30_000,
    requiredEntities: ['plan'],
    validateInput: (input) => validatePlanInput(input),
    preconditions(environment) {
      const plan = currentPlan(environment);
      if (!allowed.includes(plan.status)) throw coreError('CORE_PRECONDITION_FAILED', `El plan no puede pasar de ${plan.status} a ${nextStatus}.`);
      if (nextStatus === 'active') {
        if (!plan.exerciseIds.length) throw coreError('CORE_PRECONDITION_FAILED', 'Un plan activo requiere al menos un ejercicio.');
        const conflict = environment.state.plans.some((item) => item.patientId === plan.patientId && item.status === 'active' && item.id !== plan.id);
        if (conflict) throw coreError('CORE_PRECONDITION_FAILED', 'Ya existe un plan activo. Usa reemplazar plan activo.');
      }
    },
    execute(environment) {
      const plan = currentPlan(environment);
      plan.status = nextStatus;
      plan.updatedAt = environment.context.now;
      return {
        status: 'success',
        message: `Plan “${plan.title}” actualizado a ${nextStatus}.`,
        summary: [`${plan.title}: ${nextStatus}.`],
        href: `/plans/${plan.id}`,
        affected: [{ type: 'plan', id: plan.id }],
      };
    },
  };
}

export const planTools: ToolDefinition[] = [
  transitionTool('plan.activate', 'sensitive-write', ['draft', 'paused'], 'active'),
  transitionTool('plan.pause', 'reversible-write', ['active'], 'paused'),
  transitionTool('plan.complete', 'sensitive-write', ['active', 'paused'], 'completed'),
  transitionTool('plan.archive', 'sensitive-write', ['draft', 'paused', 'completed'], 'archived'),
  transitionTool('plan.restore', 'reversible-write', ['archived'], 'draft'),
  {
    name: 'plan.replace_active',
    version: 1,
    risk: 'sensitive-write',
    mutates: true,
    supportsUndo: true,
    undoTtlMs: 30_000,
    requiredEntities: ['patient', 'plan'],
    validateInput: (input) => validatePlanInput(input, true),
    preconditions(environment) {
      const target = currentPlan(environment);
      if (target.patientId !== environment.resolved.patient?.id) throw coreError('CORE_PRECONDITION_FAILED', 'El plan no pertenece al paciente seleccionado.');
      if (target.status === 'active') throw coreError('CORE_PRECONDITION_FAILED', 'El plan seleccionado ya está activo.');
      if (!target.exerciseIds.length) throw coreError('CORE_PRECONDITION_FAILED', 'Un plan activo requiere al menos un ejercicio.');
      const active = environment.state.plans.find((item) => item.patientId === target.patientId && item.status === 'active' && item.id !== target.id);
      if (!active) throw coreError('CORE_PRECONDITION_FAILED', 'No hay otro plan activo que reemplazar.');
    },
    execute(environment) {
      const target = currentPlan(environment);
      const active = environment.state.plans.find((item) => item.patientId === target.patientId && item.status === 'active' && item.id !== target.id)!;
      active.status = 'paused';
      active.updatedAt = environment.context.now;
      target.status = 'active';
      target.updatedAt = environment.context.now;
      return {
        status: 'success',
        message: `Plan “${target.title}” activado y “${active.title}” pausado.`,
        summary: [`${active.title}: pausado.`, `${target.title}: activo.`],
        href: `/plans/${target.id}`,
        affected: [{ type: 'plan', id: active.id }, { type: 'plan', id: target.id }],
      };
    },
  },
];
