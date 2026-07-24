import type { ActivityEvent, AtalState } from '../../data/atalStore';
import {
  actionError,
  type ActionAffectedEntity,
  type ActionMutationResult,
  type ActionStorePort,
  type ActionTransactionOutcome,
  type ActionTransactionRequest,
  type ActionUndoPatch,
  type ActionUndoReceipt,
} from './contracts';
import { stableSerialize } from './stableSerialize';
import { validateActionStateInvariants } from './stateInvariants';

const MAX_UNDO_TTL_MS = 30_000;

function createId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function createUndoPatches(before: AtalState, after: AtalState): ActionUndoPatch[] {
  const patches: ActionUndoPatch[] = [];
  const collections = ['patients', 'plans', 'exercises', 'clinicalRecords', 'clinicalRecordVersions', 'notes', 'sessions'] as const;

  for (const collection of collections) {
    const beforeMap = byId(before[collection] as Array<{ id: string; updatedAt?: string }>);
    const afterMap = byId(after[collection] as Array<{ id: string; updatedAt?: string }>);

    for (const [id, previous] of beforeMap) {
      const item = afterMap.get(id);
      if (!item) {
        throw actionError('CORE_INVARIANT_FAILED', `La transacción eliminó una entidad existente de ${collection}.`);
      }
      if (stableSerialize(previous) === stableSerialize(item)) continue;
      if (collection === 'clinicalRecordVersions') {
        throw actionError('CORE_INVARIANT_FAILED', 'La transacción modificó una colección no restaurable de versiones clínicas.');
      }
      patches.push({
        operation: 'restore',
        collection,
        entityId: id,
        before: structuredClone(previous),
        expectedAfterUpdatedAt: item.updatedAt,
      });
    }

    for (const [id, item] of afterMap) {
      if (beforeMap.has(id)) continue;
      patches.push({
        operation: 'remove-created',
        collection,
        entityId: id,
        expectedAfterUpdatedAt: item.updatedAt,
      });
    }
  }

  const changedSettings = Object.fromEntries(
    (Object.keys(before.settings) as Array<keyof AtalState['settings']>)
      .filter((key) => stableSerialize(before.settings[key]) !== stableSerialize(after.settings[key]))
      .map((key) => [key, structuredClone(before.settings[key])]),
  );
  if (Object.keys(changedSettings).length > 0) {
    patches.push({
      operation: 'restore',
      collection: 'settings',
      entityId: 'settings',
      before: changedSettings,
    });
  }

  return patches;
}

function entityInState(state: AtalState, entity: ActionAffectedEntity): { updatedAt?: string } | undefined {
  switch (entity.type) {
    case 'patient': return state.patients.find((item) => item.id === entity.id);
    case 'plan': return state.plans.find((item) => item.id === entity.id);
    case 'exercise': return state.exercises.find((item) => item.id === entity.id);
    case 'clinical-record': return state.clinicalRecords.find((item) => item.id === entity.id);
    case 'session': return state.sessions.find((item) => item.id === entity.id);
    case 'settings': return undefined;
  }
}

function resolveAffected(
  before: AtalState,
  after: AtalState,
  affected: ActionAffectedEntity[],
): ActionAffectedEntity[] {
  return affected.map((entity) => {
    if (entity.type === 'settings') {
      return { type: entity.type, id: entity.id };
    }
    const afterEntity = entityInState(after, entity);
    if (!afterEntity) {
      throw actionError('CORE_INVARIANT_FAILED', 'Una entidad afectada no existe después de la transacción.');
    }
    return {
      type: entity.type,
      id: entity.id,
      beforeUpdatedAt: entityInState(before, entity)?.updatedAt,
      afterUpdatedAt: afterEntity.updatedAt,
    };
  });
}

function appendAudit(
  state: AtalState,
  request: ActionTransactionRequest,
  transactionId: string,
  affected: ActionAffectedEntity[],
  undo?: ActionUndoReceipt,
): void {
  const aiOrigin = request.origin.type === 'atal-ai-general' || request.origin.type === 'atal-ai-contextual';
  const first = affected[0];
  const audit = {
    id: createId('event'),
    kind: aiOrigin ? 'ai_applied' : 'action_applied',
    origin: aiOrigin ? 'atal-ai' : 'manual',
    actionOrigin: request.origin.type,
    title: aiOrigin ? 'Atal IA aplicó cambios' : 'Cambio aplicado',
    detail: request.action,
    intent: request.action,
    entity: first?.type,
    entityId: first?.id,
    transactionId,
    toolName: request.origin.toolName,
    toolVersion: request.origin.toolVersion,
    riskLevel: request.origin.riskLevel,
    confirmationId: request.origin.confirmationId,
    affectedEntities: affected.map((entity) => ({ type: entity.type, id: entity.id })),
    outcome: 'success',
    undoReceiptId: undo?.id,
    conversationId: request.origin.conversationId,
    draftId: request.origin.draftId,
    createdAt: request.now,
  } as unknown as ActivityEvent;
  state.events.unshift(audit);
}

export function executeActionTransaction<TResult extends ActionMutationResult>(
  request: ActionTransactionRequest<TResult>,
  port: ActionStorePort,
): ActionTransactionOutcome<TResult> {
  if (!request.action.trim()) throw actionError('CORE_INPUT_INVALID', 'La acción necesita un identificador.');
  if (!Number.isFinite(Date.parse(request.now))) throw actionError('CORE_INPUT_INVALID', 'La acción necesita una fecha válida.');

  const before = structuredClone(port.read());
  const transactionId = createId(request.transactionIdPrefix?.trim() || 'action-transaction');
  let outcome: ActionTransactionOutcome<TResult> | undefined;

  port.mutate((candidate) => {
    const result = request.mutate(candidate, transactionId);
    validateActionStateInvariants(candidate, before);

    const beforeEventIds = new Set(before.events.map((event) => event.id));
    const beforeNotificationIds = new Set(before.notifications.map((notification) => notification.id));
    const generatedEventIds = candidate.events.filter((event) => !beforeEventIds.has(event.id)).map((event) => event.id);
    const generatedNotificationIds = candidate.notifications
      .filter((notification) => !beforeNotificationIds.has(notification.id))
      .map((notification) => notification.id);
    const patches = createUndoPatches(before, candidate);
    const affected = resolveAffected(before, candidate, result.affected);

    const ttl = Math.min(Math.max(request.undoTtlMs ?? MAX_UNDO_TTL_MS, 0), MAX_UNDO_TTL_MS);
    const undo = request.supportsUndo ? {
      id: createId('undo'),
      transactionId,
      action: request.action,
      issuedAt: request.now,
      expiresAt: new Date(Date.parse(request.now) + ttl).toISOString(),
      patches,
      generatedEventIds,
      generatedNotificationIds,
    } satisfies ActionUndoReceipt : undefined;

    appendAudit(candidate, request, transactionId, affected, undo);
    outcome = {
      ...result,
      affected,
      undo,
      transactionId,
      committedAt: request.now,
    };
  });

  if (!outcome) throw actionError('CORE_EXECUTION_FAILED', 'No se pudo completar la acción.');
  return outcome;
}
