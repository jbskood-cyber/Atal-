import type { ActivityEvent, AtalState } from '../../data/atalStore';
import {
  actionError,
  type ActionOrigin,
  type ActionStorePort,
  type ActionUndoPatch,
  type ActionUndoReceipt,
} from './contracts';
import { validateActionStateInvariants } from './stateInvariants';

function createId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

type EntityWithVersion = { id: string; updatedAt?: string };
type EntityCollection = Exclude<ActionUndoPatch['collection'], 'settings'>;

function collection(state: AtalState, name: EntityCollection): EntityWithVersion[] {
  return state[name] as EntityWithVersion[];
}

function verifyExpected(item: EntityWithVersion | undefined, patch: ActionUndoPatch): void {
  if (!item) throw actionError('CORE_UNDO_STALE', 'La entidad que se intenta deshacer ya no existe.');
  if (patch.expectedAfterUpdatedAt && item.updatedAt !== patch.expectedAfterUpdatedAt) {
    throw actionError('CORE_UNDO_STALE', 'La entidad cambió después de la acción original.');
  }
}

function removeCreated(
  state: AtalState,
  patch: Extract<ActionUndoPatch, { operation: 'remove-created' }>,
  scheduled: Set<string>,
): void {
  const items = collection(state, patch.collection);
  const current = items.find((item) => item.id === patch.entityId);
  verifyExpected(current, patch);

  if (patch.collection === 'exercises' && state.plans.some((plan) => plan.exerciseIds.includes(patch.entityId))) {
    throw actionError('CORE_UNDO_STALE', 'El ejercicio ya está relacionado con otro plan.');
  }
  if (patch.collection === 'plans' && (
    state.sessions.some((session) => session.planId === patch.entityId && !scheduled.has(`sessions:${session.id}`))
    || state.clinicalRecords.some((record) => record.planId === patch.entityId && !scheduled.has(`clinicalRecords:${record.id}`))
  )) {
    throw actionError('CORE_UNDO_STALE', 'El plan ya tiene relaciones posteriores.');
  }
  if (patch.collection === 'patients' && (
    state.plans.some((plan) => plan.patientId === patch.entityId)
    || state.clinicalRecords.some((record) => record.patientId === patch.entityId)
    || state.sessions.some((session) => session.patientId === patch.entityId)
    || state.notes.some((note) => note.patientId === patch.entityId)
  )) {
    throw actionError('CORE_UNDO_STALE', 'El paciente ya tiene relaciones posteriores.');
  }

  (state[patch.collection] as EntityWithVersion[]) = items.filter((item) => item.id !== patch.entityId) as never;
}

function restore(state: AtalState, patch: Extract<ActionUndoPatch, { operation: 'restore' }>): void {
  if (patch.collection === 'settings') {
    state.settings = { ...state.settings, ...(patch.before as Partial<typeof state.settings>) };
    return;
  }
  const items = collection(state, patch.collection);
  const index = items.findIndex((item) => item.id === patch.entityId);
  verifyExpected(index >= 0 ? items[index] : undefined, patch);
  items[index] = structuredClone(patch.before) as EntityWithVersion;
}

const REMOVE_ORDER: Record<EntityCollection, number> = {
  notifications: 1,
  events: 1,
  clinicalRecordVersions: 1,
  notes: 1,
  sessions: 2,
  plans: 3,
  clinicalRecords: 4,
  exercises: 5,
  patients: 6,
};

const RESTORE_ORDER: Record<Extract<ActionUndoPatch, { operation: 'restore' }>['collection'], number> = {
  settings: 1,
  notes: 2,
  sessions: 2,
  exercises: 3,
  plans: 4,
  clinicalRecords: 5,
  patients: 6,
};

export type ActionUndoOutcome = {
  status: 'success';
  message: string;
  summary: string[];
  data: { undoneTransactionId: string };
  affected: [];
  transactionId: string;
  committedAt: string;
};

export function executeActionUndo(
  receipt: ActionUndoReceipt,
  now: string,
  origin: ActionOrigin,
  port: ActionStorePort,
): ActionUndoOutcome {
  if (receipt.consumedAt) throw actionError('CORE_UNDO_STALE', 'Este cambio ya fue deshecho.');
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs) || nowMs >= Date.parse(receipt.expiresAt)) {
    throw actionError('CORE_UNDO_EXPIRED', 'El tiempo para deshacer este cambio terminó.');
  }

  const undoTransactionId = createId('action-undo');
  let outcome: ActionUndoOutcome | undefined;

  port.mutate((candidate) => {
    candidate.events = candidate.events.filter((event) => !receipt.generatedEventIds.includes(event.id));
    candidate.notifications = candidate.notifications.filter((notification) => !receipt.generatedNotificationIds.includes(notification.id));

    const restores = receipt.patches
      .filter((patch): patch is Extract<ActionUndoPatch, { operation: 'restore' }> => patch.operation === 'restore')
      .sort((left, right) => RESTORE_ORDER[left.collection] - RESTORE_ORDER[right.collection]);
    for (const patch of restores) restore(candidate, patch);

    const removals = receipt.patches
      .filter((patch): patch is Extract<ActionUndoPatch, { operation: 'remove-created' }> => patch.operation === 'remove-created')
      .sort((left, right) => REMOVE_ORDER[left.collection] - REMOVE_ORDER[right.collection]);
    const scheduled = new Set(removals.map((patch) => `${patch.collection}:${patch.entityId}`));
    for (const patch of removals) removeCreated(candidate, patch, scheduled);

    validateActionStateInvariants(candidate);
    const aiOrigin = origin.type === 'atal-ai-general' || origin.type === 'atal-ai-contextual';
    const audit = {
      id: createId('event'),
      kind: aiOrigin ? 'ai_applied' : 'action_applied',
      origin: aiOrigin ? 'atal-ai' : 'manual',
      actionOrigin: origin.type,
      title: aiOrigin ? 'Cambio de Atal IA deshecho' : 'Cambio deshecho',
      detail: receipt.action,
      intent: receipt.action,
      transactionId: undoTransactionId,
      toolName: origin.toolName,
      toolVersion: origin.toolVersion,
      riskLevel: origin.riskLevel,
      affectedEntities: [],
      outcome: 'undone',
      undoReceiptId: receipt.id,
      conversationId: origin.conversationId,
      draftId: origin.draftId,
      createdAt: now,
    } as unknown as ActivityEvent;
    candidate.events.unshift(audit);

    outcome = {
      status: 'success',
      message: 'Cambio deshecho correctamente.',
      summary: ['Se restauró el estado anterior.'],
      data: { undoneTransactionId: receipt.transactionId },
      affected: [],
      transactionId: undoTransactionId,
      committedAt: now,
    };
  });

  if (!outcome) throw actionError('CORE_EXECUTION_FAILED', 'No se pudo completar el deshacer.');
  receipt.consumedAt = now;
  return outcome;
}
