import type { PlanEntity } from '@/src/data/atalStore';
import { coreError, type EntityRef, type ToolDefinition, type ToolRisk } from '../contracts';
import { materializeExercises, validateDraftInput, type DraftToolInput } from './exerciseTools';
import { checkVersion, durationText, frequencyText } from './patientTools';

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
  {
    name: 'plan.create_for_patient', version: 1, risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000,
    requiredEntities: ['patient'], validateInput: (input) => validateDraftInput(input, 'create_plan_for_existing_patient'),
    preconditions(environment, input) {
      const { draft, force } = input as DraftToolInput;
      const patient = environment.state.patients.find((item) => item.id === environment.resolved.patient?.id);
      if (!patient) throw coreError('CORE_PRECONDITION_FAILED', 'El paciente ya no existe.');
      checkVersion(draft.baseVersions.patientUpdatedAt, patient.updatedAt, force, 'paciente');
      if (!draft.plan.title.trim()) throw coreError('CORE_INPUT_INVALID', 'Añade un título al plan.');
      if (draft.plan.status === 'active' && environment.state.plans.some((item) => item.patientId === patient.id && item.status === 'active')) {
        throw coreError('CORE_PRECONDITION_FAILED', 'Este paciente ya tiene un plan activo.');
      }
    },
    execute(environment, input) {
      const { draft } = input as DraftToolInput;
      const patient = environment.state.patients.find((item) => item.id === environment.resolved.patient?.id)!;
      const exercises = materializeExercises(environment, draft.exercises);
      if (draft.plan.status === 'active' && !exercises.exerciseIds.length) throw coreError('CORE_PRECONDITION_FAILED', 'Un plan activo requiere ejercicios.');
      const plan = {
        id: `${environment.transactionId}-plan`, patientId: patient.id, title: draft.plan.title.trim(), focus: draft.plan.focus,
        duration: durationText(draft), frequency: frequencyText(draft), goal: draft.plan.goal,
        exerciseIds: exercises.exerciseIds, status: draft.plan.status, progression: draft.plan.phases.join('\n'),
        reportCriteria: draft.plan.progressCriteria || 'Reportar dolor elevado, síntomas o imposibilidad para completar.',
        generalInstructions: draft.plan.generalInstructions, createdAt: environment.context.now, updatedAt: environment.context.now,
      };
      environment.state.plans.push(plan);
      const affected = [...exercises.affected, { type: 'plan' as const, id: plan.id }];
      const record = environment.state.clinicalRecords.find((item) => item.patientId === patient.id);
      if (record && record.planId !== plan.id) {
        const before = structuredClone(record);
        environment.state.clinicalRecordVersions.push({ id: `${environment.transactionId}-record-version`, recordId: before.id, patientId: patient.id, version: before.version, snapshot: before, createdAt: environment.context.now });
        record.planId = plan.id; record.version += 1; record.updatedAt = environment.context.now;
        affected.push({ type: 'clinical-record', id: record.id });
      }
      const summary = [...exercises.summary, `Plan creado como ${plan.status === 'active' ? 'activo' : 'borrador'}.`];
      return { status: 'success', message: summary.join(' '), summary, data: { patientId: patient.id, planId: plan.id, exerciseId: exercises.firstCreatedId }, href: `/plans/${plan.id}`, affected };
    },
  },
  {
    name: 'plan.update', version: 1, risk: 'reversible-write', mutates: true, supportsUndo: true, undoTtlMs: 30_000,
    requiredEntities: ['patient', 'plan'], validateInput: (input) => validateDraftInput(input, 'update_existing_plan'),
    preconditions(environment, input) {
      const { draft, force } = input as DraftToolInput;
      const plan = currentPlan(environment);
      if (plan.patientId !== environment.resolved.patient?.id) throw coreError('CORE_PRECONDITION_FAILED', 'El plan no pertenece al paciente.');
      checkVersion(draft.baseVersions.planUpdatedAt, plan.updatedAt, force, 'plan');
    },
    execute(environment, input) {
      const { draft } = input as DraftToolInput;
      const plan = currentPlan(environment);
      const exercises = materializeExercises(environment, draft.exercises);
      const exerciseIds = exercises.exerciseIds;
      plan.title = draft.plan.title.trim() || plan.title; plan.focus = draft.plan.focus.trim() || plan.focus;
      plan.goal = draft.plan.goal.trim() || plan.goal; plan.duration = draft.plan.duration.value !== null || draft.plan.duration.customText ? durationText(draft) : plan.duration;
      plan.frequency = draft.plan.frequency.value !== null || draft.plan.frequency.customText ? frequencyText(draft) : plan.frequency;
      plan.progression = draft.plan.phases.length ? draft.plan.phases.join('\n') : plan.progression;
      plan.reportCriteria = draft.plan.progressCriteria.trim() || plan.reportCriteria; plan.generalInstructions = draft.plan.generalInstructions.trim() || plan.generalInstructions;
      plan.exerciseIds = [...new Set([...plan.exerciseIds,...exerciseIds])]; plan.updatedAt = environment.context.now;
      const summary = [...exercises.summary, `Plan actualizado: ${plan.title}.`];
      return { status: 'success', message: summary.join(' '), summary, data: { patientId: plan.patientId, planId: plan.id, exerciseId: exercises.firstCreatedId }, href: `/plans/${plan.id}`, affected: [...exercises.affected, { type: 'plan', id: plan.id }] };
    },
  },
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
