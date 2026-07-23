import type { ExerciseEntity, PlanEntity } from '@/src/data/atalStore';
import {
  coreError,
  type EntityRef,
  type ToolDefinition,
  type ToolExecutionEnvironment,
} from '../contracts';

function objectInput(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw coreError('CORE_INPUT_INVALID', message);
  }
  return input as Record<string, unknown>;
}

function entityRef(value: unknown, type: EntityRef['type']): EntityRef {
  if (!value || typeof value !== 'object' || (value as EntityRef).type !== type) {
    throw coreError('CORE_INPUT_INVALID', `Selecciona una referencia ${type} válida.`);
  }
  const reference = value as EntityRef;
  if (!reference.id?.trim() && !reference.label?.trim()) {
    throw coreError('CORE_INPUT_INVALID', `La referencia ${type} necesita id o nombre.`);
  }
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
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw coreError('CORE_INPUT_INVALID', 'La lista indicada no es válida.');
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))].slice(0, max);
}

function optionalInteger(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw coreError('CORE_INPUT_INVALID', `El valor debe ser un entero entre ${min} y ${max}.`);
  }
  return parsed;
}

function optionalNumber(value: unknown, min: number, max: number): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw coreError('CORE_INPUT_INVALID', `El valor debe estar entre ${min} y ${max}.`);
  }
  return parsed;
}

function resolvedPlan(environment: ToolExecutionEnvironment): PlanEntity {
  const plan = environment.state.plans.find((item) => item.id === environment.resolved.plan?.id);
  if (!plan) throw coreError('CORE_PRECONDITION_FAILED', 'El plan ya no existe.');
  return plan;
}

function resolvedExercise(environment: ToolExecutionEnvironment): ExerciseEntity {
  const exercise = environment.state.exercises.find((item) => item.id === environment.resolved.exercise?.id);
  if (!exercise) throw coreError('CORE_PRECONDITION_FAILED', 'El ejercicio ya no existe.');
  return exercise;
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
  patch: Partial<Pick<PlanEntity,
    'title' | 'focus' | 'duration' | 'frequency' | 'goal' | 'progression' | 'reportCriteria' | 'generalInstructions'>>;
};

type PlanDuplicateInput = { plan: EntityRef; title?: string };
type MembershipInput = { plan: EntityRef; operation: 'add' | 'remove' | 'reorder'; exerciseIds: string[] };

type ExerciseCreateInput = Omit<ExerciseEntity, 'id' | 'status' | 'source' | 'createdAt' | 'updatedAt' | 'media'> & {
  media: ExerciseEntity['media'];
};

type ExerciseUpdateInput = {
  exercise: EntityRef;
  patch: Partial<Omit<ExerciseEntity, 'id' | 'source' | 'createdAt' | 'updatedAt' | 'media' | 'status'>>;
};

type ExerciseDuplicateInput = { exercise: EntityRef; name?: string };
type ExerciseLifecycleInput = { exercise: EntityRef; archived: boolean };

function validatePlanCreate(input: unknown): PlanCreateInput {
  const value = objectInput(input, 'Los datos del plan no son válidos.');
  const title = optionalText(value.title, 220) ?? '';
  if (!title) throw coreError('CORE_INPUT_INVALID', 'Añade un título al plan.');
  const exerciseIds = stringList(value.exerciseIds) ?? [];
  const status = value.status === 'active' ? 'active' : 'draft';
  if (status === 'active' && exerciseIds.length === 0) {
    throw coreError('CORE_INPUT_INVALID', 'Un plan activo necesita al menos un ejercicio.');
  }
  return {
    patient: entityRef(value.patient, 'patient'),
    title,
    focus: optionalText(value.focus) ?? '',
    duration: optionalText(value.duration, 120) ?? 'Por definir',
    frequency: optionalText(value.frequency, 120) ?? 'Por definir',
    goal: optionalText(value.goal) ?? '',
    exerciseIds,
    status,
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

function validateExerciseCreate(input: unknown): ExerciseCreateInput {
  const value = objectInput(input, 'Los datos del ejercicio no son válidos.');
  const name = optionalText(value.name, 220) ?? '';
  if (!name) throw coreError('CORE_INPUT_INVALID', 'Añade el nombre del ejercicio.');
  return {
    name,
    region: optionalText(value.region, 180) ?? 'General',
    category: optionalText(value.category, 180) ?? 'Personalizado',
    objective: optionalText(value.objective) ?? '',
    startingPosition: optionalText(value.startingPosition) ?? '',
    instructions: stringList(value.instructions) ?? [],
    precautions: optionalText(value.precautions) ?? '',
    equipment: optionalText(value.equipment, 500) ?? '',
    difficulty: optionalText(value.difficulty, 120) ?? '',
    sets: optionalInteger(value.sets, 1, 100) ?? 1,
    repetitions: optionalInteger(value.repetitions, 1, 10_000),
    time: optionalText(value.time, 120),
    rest: optionalText(value.rest, 120) ?? '',
    maxPain: optionalNumber(value.maxPain, 0, 10) ?? null,
    tags: stringList(value.tags) ?? [],
    notes: optionalText(value.notes) ?? '',
    media: { type: 'none' },
  };
}

function validateExerciseUpdate(input: unknown): ExerciseUpdateInput {
  const value = objectInput(input, 'La actualización del ejercicio no es válida.');
  const raw = objectInput(value.patch, 'No se indicaron cambios para el ejercicio.');
  const patch: ExerciseUpdateInput['patch'] = {};
  for (const key of ['name', 'region', 'category', 'objective', 'startingPosition', 'precautions', 'equipment', 'difficulty', 'time', 'rest', 'notes'] as const) {
    const next = optionalText(raw[key], key === 'name' ? 220 : 5_000);
    if (next !== undefined) patch[key] = next;
  }
  for (const key of ['instructions', 'tags'] as const) {
    const next = stringList(raw[key]);
    if (next !== undefined) patch[key] = next;
  }
  const sets = optionalInteger(raw.sets, 1, 100);
  const repetitions = optionalInteger(raw.repetitions, 1, 10_000);
  const maxPain = optionalNumber(raw.maxPain, 0, 10);
  if (sets !== undefined) patch.sets = sets;
  if (repetitions !== undefined) patch.repetitions = repetitions;
  if (maxPain !== undefined) patch.maxPain = maxPain;
  if (Object.keys(patch).length === 0) throw coreError('CORE_INPUT_INVALID', 'No se indicaron cambios para el ejercicio.');
  return { exercise: entityRef(value.exercise, 'exercise'), patch };
}

const planCreateTool: ToolDefinition<PlanCreateInput> = {
  name: 'plan.create_simple',
  version: 1,
  description: 'Crea un plan canónico para un paciente existente usando campos directos.',
  risk: 'reversible-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: ['patient'],
  validateInput: validatePlanCreate,
  preconditions(environment, input) {
    const existingExercises = new Set(environment.state.exercises.map((item) => item.id));
    if (input.exerciseIds.some((id) => !existingExercises.has(id))) {
      throw coreError('CORE_PRECONDITION_FAILED', 'El plan incluye un ejercicio inexistente.');
    }
    if (input.status === 'active' && environment.state.plans.some((item) => item.patientId === environment.resolved.patient?.id && item.status === 'active')) {
      throw coreError('CORE_PRECONDITION_FAILED', 'El paciente ya tiene un plan activo. Usa reemplazar plan activo.');
    }
  },
  execute(environment, input) {
    const patient = environment.resolved.patient!;
    const plan: PlanEntity = {
      id: `${environment.transactionId}-plan`,
      patientId: patient.id,
      title: input.title,
      focus: input.focus,
      duration: input.duration,
      frequency: input.frequency,
      goal: input.goal,
      exerciseIds: [...input.exerciseIds],
      status: input.status,
      progression: input.progression,
      reportCriteria: input.reportCriteria,
      generalInstructions: input.generalInstructions,
      createdAt: environment.context.now,
      updatedAt: environment.context.now,
    };
    environment.state.plans.push(plan);
    return {
      status: 'success',
      message: `Plan “${plan.title}” creado.`,
      summary: [`Plan creado como ${plan.status}.`],
      data: { patientId: patient.id, planId: plan.id },
      href: `/plans/${plan.id}`,
      affected: [{ type: 'plan', id: plan.id }],
    };
  },
};

const planUpdateTool: ToolDefinition<PlanUpdateInput> = {
  name: 'plan.update_fields',
  version: 1,
  description: 'Actualiza campos directos de un plan sin alterar su membresía de ejercicios.',
  risk: 'reversible-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: ['plan'],
  validateInput: validatePlanUpdate,
  preconditions() {},
  execute(environment, input) {
    const plan = resolvedPlan(environment);
    Object.assign(plan, input.patch, {
      id: plan.id,
      patientId: plan.patientId,
      createdAt: plan.createdAt,
      updatedAt: environment.context.now,
    });
    return {
      status: 'success',
      message: `Plan “${plan.title}” actualizado.`,
      summary: ['Datos del plan actualizados.'],
      data: { patientId: plan.patientId, planId: plan.id },
      href: `/plans/${plan.id}`,
      affected: [{ type: 'plan', id: plan.id }],
    };
  },
};

const planDuplicateTool: ToolDefinition<PlanDuplicateInput> = {
  name: 'plan.duplicate',
  version: 1,
  description: 'Duplica un plan existente como borrador.',
  risk: 'reversible-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: ['plan'],
  validateInput(input) {
    const value = objectInput(input, 'La duplicación del plan no es válida.');
    return { plan: entityRef(value.plan, 'plan'), title: optionalText(value.title, 220) };
  },
  preconditions() {},
  execute(environment, input) {
    const source = resolvedPlan(environment);
    const duplicate: PlanEntity = {
      ...structuredClone(source),
      id: `${environment.transactionId}-plan`,
      title: input.title || `${source.title} — copia`,
      status: 'draft',
      createdAt: environment.context.now,
      updatedAt: environment.context.now,
    };
    environment.state.plans.push(duplicate);
    return {
      status: 'success',
      message: `Plan “${duplicate.title}” creado como borrador.`,
      summary: ['Plan duplicado.'],
      data: { patientId: duplicate.patientId, planId: duplicate.id },
      href: `/plans/${duplicate.id}`,
      affected: [{ type: 'plan', id: duplicate.id }],
    };
  },
};

const planMembershipTool: ToolDefinition<MembershipInput> = {
  name: 'plan.membership',
  version: 1,
  description: 'Añade, retira o reordena ejercicios de un plan.',
  risk: 'reversible-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: ['plan'],
  validateInput(input) {
    const value = objectInput(input, 'La membresía del plan no es válida.');
    const operation = value.operation;
    if (operation !== 'add' && operation !== 'remove' && operation !== 'reorder') {
      throw coreError('CORE_INPUT_INVALID', 'Selecciona añadir, retirar o reordenar.');
    }
    const exerciseIds = stringList(value.exerciseIds) ?? [];
    if (!exerciseIds.length) throw coreError('CORE_INPUT_INVALID', 'Indica al menos un ejercicio.');
    return { plan: entityRef(value.plan, 'plan'), operation, exerciseIds };
  },
  preconditions(environment, input) {
    const plan = resolvedPlan(environment);
    const existingExercises = new Set(environment.state.exercises.map((item) => item.id));
    if (input.exerciseIds.some((id) => !existingExercises.has(id))) {
      throw coreError('CORE_PRECONDITION_FAILED', 'Uno de los ejercicios no existe.');
    }
    if (input.operation === 'reorder') {
      const sameMembership = input.exerciseIds.length === plan.exerciseIds.length
        && input.exerciseIds.every((id) => plan.exerciseIds.includes(id));
      if (!sameMembership) {
        throw coreError('CORE_PRECONDITION_FAILED', 'El nuevo orden debe contener exactamente los ejercicios actuales.');
      }
    }
    if (input.operation === 'remove' && plan.status === 'active') {
      const remaining = plan.exerciseIds.filter((id) => !input.exerciseIds.includes(id));
      if (!remaining.length) throw coreError('CORE_PRECONDITION_FAILED', 'Un plan activo no puede quedarse sin ejercicios.');
    }
  },
  execute(environment, input) {
    const plan = resolvedPlan(environment);
    if (input.operation === 'add') plan.exerciseIds = [...new Set([...plan.exerciseIds, ...input.exerciseIds])];
    if (input.operation === 'remove') plan.exerciseIds = plan.exerciseIds.filter((id) => !input.exerciseIds.includes(id));
    if (input.operation === 'reorder') plan.exerciseIds = [...input.exerciseIds];
    plan.updatedAt = environment.context.now;
    return {
      status: 'success',
      message: 'Ejercicios del plan actualizados.',
      summary: [`Membresía del plan: ${input.operation}.`],
      data: { patientId: plan.patientId, planId: plan.id, exerciseIds: plan.exerciseIds },
      href: `/plans/${plan.id}`,
      affected: [{ type: 'plan', id: plan.id }],
    };
  },
};

const exerciseCreateTool: ToolDefinition<ExerciseCreateInput> = {
  name: 'exercise.create_simple',
  version: 1,
  description: 'Crea un ejercicio canónico usando campos directos.',
  risk: 'reversible-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: [],
  validateInput: validateExerciseCreate,
  preconditions() {},
  execute(environment, input) {
    const exercise: ExerciseEntity = {
      ...input,
      id: `${environment.transactionId}-exercise`,
      status: 'active',
      source: 'local',
      createdAt: environment.context.now,
      updatedAt: environment.context.now,
    };
    environment.state.exercises.push(exercise);
    return {
      status: 'success',
      message: `Ejercicio “${exercise.name}” creado.`,
      summary: ['Ejercicio creado.'],
      data: { exerciseId: exercise.id },
      href: `/exercises/${exercise.id}`,
      affected: [{ type: 'exercise', id: exercise.id }],
    };
  },
};

const exerciseUpdateTool: ToolDefinition<ExerciseUpdateInput> = {
  name: 'exercise.update_fields',
  version: 1,
  description: 'Actualiza la prescripción y contenido de un ejercicio.',
  risk: 'reversible-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: ['exercise'],
  validateInput: validateExerciseUpdate,
  preconditions() {},
  execute(environment, input) {
    const exercise = resolvedExercise(environment);
    Object.assign(exercise, input.patch, {
      id: exercise.id,
      source: exercise.source,
      createdAt: exercise.createdAt,
      updatedAt: environment.context.now,
    });
    return {
      status: 'success',
      message: `Ejercicio “${exercise.name}” actualizado.`,
      summary: ['Ejercicio actualizado.'],
      data: { exerciseId: exercise.id },
      href: `/exercises/${exercise.id}`,
      affected: [{ type: 'exercise', id: exercise.id }],
    };
  },
};

const exerciseDuplicateTool: ToolDefinition<ExerciseDuplicateInput> = {
  name: 'exercise.duplicate',
  version: 1,
  description: 'Duplica un ejercicio como elemento local activo.',
  risk: 'reversible-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: ['exercise'],
  validateInput(input) {
    const value = objectInput(input, 'La duplicación del ejercicio no es válida.');
    return { exercise: entityRef(value.exercise, 'exercise'), name: optionalText(value.name, 220) };
  },
  preconditions() {},
  execute(environment, input) {
    const source = resolvedExercise(environment);
    const duplicate: ExerciseEntity = {
      ...structuredClone(source),
      id: `${environment.transactionId}-exercise`,
      name: input.name || `${source.name} — copia`,
      status: 'active',
      source: 'local',
      createdAt: environment.context.now,
      updatedAt: environment.context.now,
    };
    environment.state.exercises.push(duplicate);
    return {
      status: 'success',
      message: `Ejercicio “${duplicate.name}” duplicado.`,
      summary: ['Ejercicio duplicado.'],
      data: { exerciseId: duplicate.id },
      href: `/exercises/${duplicate.id}`,
      affected: [{ type: 'exercise', id: duplicate.id }],
    };
  },
};

const exerciseLifecycleTool: ToolDefinition<ExerciseLifecycleInput> = {
  name: 'exercise.lifecycle',
  version: 1,
  description: 'Archiva o restaura un ejercicio.',
  risk: 'reversible-write',
  mutates: true,
  supportsUndo: true,
  undoTtlMs: 30_000,
  requiredEntities: ['exercise'],
  validateInput(input) {
    const value = objectInput(input, 'La acción del ejercicio no es válida.');
    if (typeof value.archived !== 'boolean') {
      throw coreError('CORE_INPUT_INVALID', 'Indica si el ejercicio debe archivarse o restaurarse.');
    }
    return { exercise: entityRef(value.exercise, 'exercise'), archived: value.archived };
  },
  preconditions() {},
  execute(environment, input) {
    const exercise = resolvedExercise(environment);
    exercise.status = input.archived ? 'archived' : 'active';
    exercise.updatedAt = environment.context.now;
    return {
      status: 'success',
      message: `Ejercicio ${input.archived ? 'archivado' : 'restaurado'}.`,
      summary: [`Ejercicio ${input.archived ? 'archivado' : 'restaurado'}.`],
      data: { exerciseId: exercise.id },
      href: `/exercises/${exercise.id}`,
      affected: [{ type: 'exercise', id: exercise.id }],
    };
  },
};

export const universalPlanExerciseTools: ToolDefinition<any>[] = [
  planCreateTool,
  planUpdateTool,
  planDuplicateTool,
  planMembershipTool,
  exerciseCreateTool,
  exerciseUpdateTool,
  exerciseDuplicateTool,
  exerciseLifecycleTool,
];
