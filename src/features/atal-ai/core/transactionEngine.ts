import type { ActivityEvent, AtalState } from '@/src/data/atalStore';
import { atalStorePort } from './atalStorePort';
import {
  CoreExecutionError,
  coreError,
  type AffectedEntity,
  type StorePort,
  type ToolSuccess,
  type TransactionOutcome,
  type TransactionRequest,
  type UndoPatch,
  type UndoReceipt,
} from './contracts';
import { decideExecutionPolicy } from './riskPolicy';
import { validateAtalStateInvariants } from './stateInvariants';
import { stableSerialize } from './stableValue';

const MAX_UNDO_TTL_MS = 30_000;

function createId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

type ArrayCollection = 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'clinicalRecordVersions' | 'notes' | 'sessions';

function createUndoPatches(before: AtalState, after: AtalState): UndoPatch[] {
  const patches: UndoPatch[] = [];
  const collections: ArrayCollection[] = ['patients', 'plans', 'exercises', 'clinicalRecords', 'clinicalRecordVersions', 'notes', 'sessions'];

  for (const collection of collections) {
    const beforeItems = before[collection] as Array<{ id: string; updatedAt?: string }>;
    const afterItems = after[collection] as Array<{ id: string; updatedAt?: string }>;
    const beforeById = new Map(beforeItems.map((item) => [item.id, item]));
    const afterById = new Map(afterItems.map((item) => [item.id, item]));

    for (const item of beforeItems) {
      const current = afterById.get(item.id);
      if (!current) throw coreError('CORE_INVARIANT_FAILED', `La transacción eliminó una entidad existente de ${collection}.`);
      if (stableSerialize(item) !== stableSerialize(current)) {
        if (!['patients', 'plans', 'exercises', 'clinicalRecords', 'notes', 'sessions'].includes(collection)) {
          throw coreError('CORE_INVARIANT_FAILED', `La transacción modificó una colección no restaurable: ${collection}.`);
        }
        patches.push({
          operation: 'restore',
          collection: collection as 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'notes' | 'sessions',
          entityId: item.id,
          before: structuredClone(item),
          expectedAfterUpdatedAt: current.updatedAt,
        });
      }
    }

    for (const item of afterItems) {
      if (!beforeById.has(item.id)) {
        patches.push({
          operation: 'remove-created',
          collection,
          entityId: item.id,
          expectedAfterUpdatedAt: item.updatedAt,
        });
      }
    }
  }

  const changedSettings = Object.fromEntries(
    Object.keys(before.settings)
      .filter((key) => stableSerialize(before.settings[key as keyof typeof before.settings])
        !== stableSerialize(after.settings[key as keyof typeof after.settings]))
      .map((key) => [key, before.settings[key as keyof typeof before.settings]]),
  );
  if (Object.keys(changedSettings).length > 0) {
    patches.push({ operation: 'restore', collection: 'settings', entityId: 'settings', before: changedSettings });
  }

  return patches;
}

function findAffectedAfter(state: AtalState, affected: AffectedEntity[]): AffectedEntity[] {
  return affected.map((item) => {
    const collection = item.type === 'patient' ? state.patients
      : item.type === 'plan' ? state.plans
        : item.type === 'exercise' ? state.exercises
          : item.type === 'clinical-record' ? state.clinicalRecords
            : item.type === 'session' ? state.sessions
              : undefined;
    if (item.type === 'settings') return { ...item };
    const entity = collection?.find((candidate) => candidate.id === item.id);
    if (!entity) throw coreError('CORE_INVARIANT_FAILED', 'Una entidad afectada no existe después de la transacción.');
    return { ...item, afterUpdatedAt: entity.updatedAt };
  });
}

function appendAudit(
  state: AtalState,
  request: TransactionRequest,
  transactionId: string,
  committedAt: string,
  affected: AffectedEntity[],
  undo: UndoReceipt | undefined,
): void {
  const audit: ActivityEvent = {
    id: createId('event'),
    kind: 'ai_applied',
    origin: 'atal-ai',
    title: 'Atal IA aplicó cambios',
    detail: request.definition.name,
    transactionId,
    toolName: request.definition.name,
    toolVersion: request.definition.version,
    riskLevel: request.definition.risk,
    confirmationId: request.confirmation?.id,
    affectedEntities: affected.map(({ type, id }) => ({ type, id })),
    outcome: 'success',
    undoReceiptId: undo?.id,
    conversationId: request.context.conversationId,
    draftId: request.context.draftId,
    createdAt: committedAt,
  };
  state.events.unshift(audit);
}

export function executeMutationTransaction<TInput, TData = unknown>(
  request: TransactionRequest<TInput>,
  port: StorePort = atalStorePort,
): TransactionOutcome<TData> {
  if (!request.definition.mutates || request.definition.risk === 'read') {
    throw coreError('CORE_EXECUTION_FAILED', 'Una herramienta de lectura no puede entrar en una transacción.');
  }
  const decision = decideExecutionPolicy(request.definition, request.invocation, request.confirmation, request.context.now);
  if (decision.mode !== 'none') {
    if (decision.mode === 'blocked') throw coreError('CORE_EXTERNAL_BLOCKED', decision.reason);
    throw coreError(request.confirmation ? 'CORE_CONFIRMATION_STALE' : 'CORE_CONFIRMATION_REQUIRED', decision.reason);
  }

  const before = structuredClone(port.read());
  const transactionId = createId('ai-transaction');
  const committedAt = request.context.now;
  let outcome: TransactionOutcome<TData> | undefined;

  port.mutate((candidate) => {
    const environment = { state: candidate, context: request.context, resolved: request.resolved, transactionId };
    try {
      request.definition.preconditions(environment, request.invocation.input);
    } catch (error) {
      if (error instanceof CoreExecutionError) throw error;
      throw coreError('CORE_PRECONDITION_FAILED', error instanceof Error ? error.message : 'No se cumplieron las condiciones de la acción.');
    }

    let success: ToolSuccess<TData>;
    try {
      success = request.definition.execute(environment, request.invocation.input) as ToolSuccess<TData>;
    } catch (error) {
      if (error instanceof CoreExecutionError) throw error;
      throw coreError('CORE_EXECUTION_FAILED', error instanceof Error ? error.message : 'No se pudo ejecutar la acción.');
    }

    validateAtalStateInvariants(candidate, before);
    const affected = findAffectedAfter(candidate, success.affected);
    const generatedEventIds = candidate.events.filter((event) => !before.events.some((item) => item.id === event.id)).map((event) => event.id);
    const generatedNotificationIds = candidate.notifications.filter((notification) => !before.notifications.some((item) => item.id === notification.id)).map((notification) => notification.id);
    const patches = createUndoPatches(before, candidate);
    const ttl = Math.min(request.definition.undoTtlMs ?? MAX_UNDO_TTL_MS, MAX_UNDO_TTL_MS);
    const undo = request.definition.supportsUndo ? {
      id: createId('undo'),
      transactionId,
      tool: request.definition.name,
      issuedAt: committedAt,
      expiresAt: new Date(Date.parse(committedAt) + ttl).toISOString(),
      patches,
      generatedEventIds,
      generatedNotificationIds,
    } satisfies UndoReceipt : undefined;

    appendAudit(candidate, request as TransactionRequest, transactionId, committedAt, affected, undo);
    outcome = { ...success, affected, undo, transactionId, committedAt };
  });

  if (!outcome) throw coreError('CORE_EXECUTION_FAILED', 'No se completó la transacción.');
  return outcome;
}
