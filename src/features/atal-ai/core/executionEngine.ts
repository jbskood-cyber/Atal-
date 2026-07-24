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
import { universalSessionSettingsTools } from './tools/universalSessionSettingsTools';
import { clientEffectTools } from './tools/clientEffectTools';

export const atalAIToolRegistry = createToolRegistry([
  ...queryTools,
  ...universalReadTools,
  ...patientTools,
  ...universalPatientTools,
  ...exerciseTools,
  ...planTools,
  ...universalPlanExerciseTools,
  ...settingsTools,
  ...universalSessionSettingsTools,
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
      : core.code === 'CORE_ENTITY_AMBIGUOUS' ? 'ENTITY_AMBIGUOUS'
        : 'ENTITY_RELATION_INVALID';
    return { status: 'clarification', clarification: { code, message: core.message } };
  }
  if ([
    'CORE_EXTERNAL_BLOCKED',
    'CORE_CONTEXT_SCOPE_VIOLATION',
    'CORE_PRECONDITION_FAILED',
    'CORE_VERSION_CONFLICT',
    'CORE_INVARIANT_FAILED',
  ].includes(core.code)) {
    return { status: 'blocked', code: core.code, message: core.message };
  }
  return { status: 'error', code: core.code, message: core.message };
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
    );
    if (contextualViolation) throw coreError('CORE_CONTEXT_SCOPE_VIOLATION', contextualViolation);

    const definition = registry.get(request.invocation.tool);
    const validatedInput = definition.validateInput(request.invocation.input);
    const invocation = { ...request.invocation, input: validatedInput };
    const snapshot = structuredClone(port.read());
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
