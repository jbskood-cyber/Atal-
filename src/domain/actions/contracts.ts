import type { AtalState } from '../../data/atalStore';

export type ActionRisk =
  | 'read'
  | 'draft'
  | 'reversible-write'
  | 'sensitive-write'
  | 'destructive'
  | 'external';

export type ActionEntityType =
  | 'patient'
  | 'clinical-record'
  | 'plan'
  | 'exercise'
  | 'session'
  | 'settings';

export type ActionAffectedEntity = {
  type: ActionEntityType;
  id: string;
  beforeUpdatedAt?: string;
  afterUpdatedAt?: string;
};

export type ActionOriginType =
  | 'manual-ui'
  | 'atal-ai-general'
  | 'atal-ai-contextual'
  | 'system';

export type ActionOrigin = {
  type: ActionOriginType;
  conversationId?: string;
  draftId?: string;
  toolName?: string;
  toolVersion?: number;
  riskLevel?: ActionRisk;
  confirmationId?: string;
};

export type ActionUndoPatch =
  | {
      operation: 'restore';
      collection: 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'notes' | 'sessions' | 'settings';
      entityId: string;
      before: unknown;
      expectedAfterUpdatedAt?: string;
    }
  | {
      operation: 'remove-created';
      collection:
        | 'patients'
        | 'plans'
        | 'exercises'
        | 'clinicalRecords'
        | 'clinicalRecordVersions'
        | 'notes'
        | 'sessions'
        | 'events'
        | 'notifications';
      entityId: string;
      expectedAfterUpdatedAt?: string;
    };

export type ActionUndoReceipt = {
  id: string;
  transactionId: string;
  action: string;
  issuedAt: string;
  expiresAt: string;
  consumedAt?: string;
  patches: ActionUndoPatch[];
  generatedEventIds: string[];
  generatedNotificationIds: string[];
};

export type ActionMutationResult<TData = unknown> = {
  status: 'success';
  message: string;
  summary: string[];
  data?: TData;
  href?: string;
  affected: ActionAffectedEntity[];
};

export type ActionTransactionRequest<TResult extends ActionMutationResult = ActionMutationResult> = {
  action: string;
  now: string;
  origin: ActionOrigin;
  supportsUndo: boolean;
  undoTtlMs?: number;
  mutate(state: AtalState, transactionId: string): TResult;
};

export type ActionTransactionOutcome<TResult extends ActionMutationResult = ActionMutationResult> = TResult & {
  transactionId: string;
  committedAt: string;
  undo?: ActionUndoReceipt;
};

export type ActionStorePort = {
  read(): AtalState;
  mutate(mutator: (state: AtalState) => void): void;
};

export class ActionExecutionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'ActionExecutionError';
  }
}

export function actionError(code: string, message: string): ActionExecutionError {
  return new ActionExecutionError(code, message);
}
