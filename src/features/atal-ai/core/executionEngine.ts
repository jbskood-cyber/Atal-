import { atalStorePort } from './atalStorePort';
import {
  CoreExecutionError,
  coreError,
  type ConfirmationProof,
  type EntityType,
  type ExecutionContext,
  type ResolvedEntities,
  type StorePort,
  type ToolExecutionResult,
  type ToolInvocation,
} from './contracts';
import { contextualInvocationViolation } from './agentic/contextualToolPolicy';
import { normalizeStructuredToolInput } from './agentic/structuredFieldHygiene';
import { resolveEntities } from './entityResolver';
import { decideExecutionPolicy } from './riskPolicy';
import { createToolRegistry, type ToolRegistry } from './toolRegistry';
import { executeMutationTransaction } from './transactionEngine';
import { blockedTools, exportTools } from './tools/exportTools';
import { patientTools } from './tools/patientTools';
import { planTools } from './tools/planTools';
import { queryTools } from './tools/queryTools';
import { settingsTools } from './tools/settingsTools';
import { exerciseTools } from './tools/exerciseTools';
import { universalReadTools } from './tools/universalReadTools';
import { universalPatientTools } from './tools/universalPatientTools';
import { universalPlanExerciseTools } from './tools/universalPlanExerciseTools';
import { canonicalPlanToolNames, canonicalPlanTools } from './tools/canonicalPlanTools';
import { canonicalPlanLifecycleToolNames, canonicalPlanLifecycleTools } from './tools/canonicalPlanLifecycleTools';
import { canonicalUniversalExerciseToolNames, canonicalUniversalExerciseTools } from './tools/canonicalUniversalExerciseTools';
import { canonicalPatientNoteToolNames, canonicalPatientNoteTools } from './tools/canonicalPatientNoteTools';
import { canonicalSettingsToolNames, canonicalSettingsTools } from './tools/canonicalSettingsTools';
import { universalSessionSettingsTools } from './tools/universalSessionSettingsTools';
import { clientEffectTools } from './tools/clientEffectTools';

const nonCanonicalPlanExerciseTools = universalPlanExerciseTools.filter((tool) =>
  !canonicalPlanToolNames.has(tool.name) && !canonicalUniversalExerciseToolNames.has(tool.name));
const nonCanonicalPlanTools = planTools.filter((tool) => !canonicalPlanLifecycleToolNames.has(tool.name));
const nonCanonicalUniversalPatientTools = universalPatientTools.filter((tool) => !canonicalPatientNoteToolNames.has(tool.name));
const nonCanonicalSettingsTools = settingsTools.filter((tool) => !canonicalSettingsToolNames.has(tool.name));
const nonCanonicalUniversalSessionSettingsTools = universalSessionSettingsTools.filter((tool) => !canonicalSettingsToolNames.has(tool.name));

export const atalAIToolRegistry = createToolRegistry([
  ...queryTools,
  ...universalReadTools,
  ...patientTools,
  ...nonCanonicalUniversalPatientTools,
  ...canonicalPatientNoteTools,
  ...exerciseTools,
  ...canonicalUniversalExerciseTools,
  ...nonCanonicalPlanTools,
  ...canonicalPlanLifecycleTools,
  ...nonCanonicalPlanExerciseTools,
  ...canonicalPlanTools,
  ...nonCanonicalSettingsTools,
  ...nonCanonicalUniversalSessionSettingsTools,
  ...canonicalSettingsTools,
  ...clientEffectTools,
  ...exportTools,
  ...blockedTools,
]);

export type ExecuteToolRequest = {
  invocation: ToolInvocation;
  context: ExecutionContext;
  confirmation?: ConfirmationProof;
};

export type ExecuteToolOptions = {
  registry?: ToolRegistry;
  port?: StorePort;
};

function resolvedValue(entities: ResolvedEntities, type: EntityType): unknown {
  if (type === 'clinical-record') return entities.clinicalRecord;
  return entities[type];
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
  }
  return value;
}

function safeResult(error: unknown): ToolExecutionResult {
  const core = error instanceof CoreExecutionError
    ? error
    : coreError('CORE_EXECUTION_FAILED', error instanceof Error ? error.message : 'No se pudo completar la acción.');
  if (['CORE_ENTITY_NOT_FOUND', 'CORE_ENTITY_AMBIGUOUS', 'CORE_ENTITY_RELATION_INVALID'].includes(core.code)) {
    const code = core.code === 'CORE_ENTITY_NOT_FOUND' ? 'ENTITY_NOT_FOUND'
      : core.code === 'CORE_ENTITY_AMBIGUOUS' ? 'ENTITY_AMIGUOUS'
        : 'ENTITY_RELATION_INVALID';
    return { status: 'clarification', clarification: { code, message: core.message } };
  }
  if (core.code === 'CORE_EXTERNAL_BLOCKED' || core.code === 'CORE_CONTEXT_SCOPE_VIOLATION') {
    return { status: 'blocked', code: core.code, message: core.message };
  }
  return { status: 'error', code: core.code, message: core.message };
}

function normalizedEntityLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-MX')
    .replace(/\s+/g, ' ');
}

function normalizeInvocationInput(
  tool: string,
  input: unknown,
  state: ReturnType<StorePort['read']>,
): unknown {
  const structuredInput = normalizeStructuredToolInput(tool, input);
  if (tool !== 'plan.membership' || !structuredInput || typeof structuredInput !== 'object' || Array.isArray(structuredInput)) return structuredInput;
  const value = structuredInput as Record<string, unknown>;
  if (!Array.isArray(value.exerciseIds) || value.exerciseIds.some((item) => typeof item !== 'string')) return structuredInput;

  const canonicalIds = value.exerciseIds.map((rawValue) => {
    const token = rawValue.trim();
    const byId = state.exercises.find((exercise) => exercise.id === token);
    if (byId) return byId.id;

    const normalized = normalizedEntityLabel(token);
    const matches = state.exercises.filter((exercise) => normalizedEntityLabel(exercise.name) === normalized);
    if (matches.length === 1) return matches[0].id;
    if (matches.length > 1) {
      throw coreError('CORE_ENTITY_AMBIGUOUS', `Hay varios ejercicios llamados “${token}”. Aclara cuál quieres usar.`);
    }
    throw coreError('CORE_ENTITY_NOT_FOUND', `No se encontró el ejercicio “${token}”.`);
  });

  return { ...value, exerciseIds: [...new Set(canonicalIds)] };
}

export function executeToolInvocation(
  request: ExecuteToolRequest,
  options: ExecuteToolOptions = {},
): ToolExecutionResult {
  const registry = options.registry ?? atalAIToolRegistry;
  const port = options.port ?? atalStorePort;

  try {
    if (request.invocation.version !== 1 || !request.invocation.proposalId || !Array.isArray(request.invocation.references)) {
      throw coreError('CORE_INPUT_INVALID', 'La propuesta de Atal IA no es válida.');
    }
    const contextualViolation = contextualInvocationViolation(
      request.context,
      request.invocation.tool,
      request.invocation.references,
      request.invocation.input,
    );
    if (contextualViolation) throw coreError('CORE_CONTEXT_SCOPE_VIOLATION', contextualViolation);

    const definition = registry.get(request.invocation.tool);
    const snapshot = structuredClone(port.read());
    const normalizedInput = normalizeInvocationInput(request.invocation.tool, request.invocation.input, snapshot);
    const validatedInput = definition.validateInput(normalizedInput);
    const invocation = { ...request.invocation, input: validatedInput };
    const resolution = resolveEntities(snapshot, invocation, request.context);
    if (resolution.status === 'clarification') return resolution;
    for (const required of definition.requiredEntities) {
      if (!resolvedValue(resolution.entities, required)) {
        return {
          status: 'clarification',
          clarification: { code: 'ENTITY_NOT_FOUND', entityType: required, message: `Falta identificar una entidad ${required}.` },
        };
      }
    }

    const decision = decideExecutionPolicy(definition, invocation, request.confirmation, request.context.now);
    if (decision.mode === 'blocked') return { status: 'blocked', code: definition.risk === 'external' ? 'CORE_EXTERNAL_BLOCKED' : 'CORE_EXECUTION_FAILED', message: decision.reason };
    if (decision.mode !== 'none') return { status: 'confirmation-required', decision, invocation };

    if (definition.mutates) {
      return executeMutationTransaction({
        definition,
        invocation,
        context: request.context,
        resolved: resolution.entities,
        confirmation: request.confirmation,
      }, port);
    }

    const immutable = freezeDeep(snapshot);
    const environment = { state: immutable, context: request.context, resolved: resolution.entities, transactionId: '' };
    definition.preconditions(environment, validatedInput);
    return definition.execute(environment, validatedInput);
  } catch (error) {
    return safeResult(error);
  }
}
