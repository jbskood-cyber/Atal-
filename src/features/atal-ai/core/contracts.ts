import type {
  AppSettings,
  AtalState,
  ExerciseEntity,
  PatientEntity,
  PlanEntity,
  SessionRecord,
} from '@/src/data/atalStore';
import type { ClinicalRecord } from '@/src/features/clinical-record/types';

export type ToolRisk =
  | 'read'
  | 'draft'
  | 'reversible-write'
  | 'sensitive-write'
  | 'destructive'
  | 'external';

export type EntityType =
  | 'patient'
  | 'clinical-record'
  | 'plan'
  | 'exercise'
  | 'session'
  | 'settings';

export type EntityRef = {
  type: EntityType;
  id?: string;
  label?: string;
  parent?: EntityRef;
};

export type ExecutionContext = {
  conversationId: string;
  draftId: string;
  route: string;
  selectedPatientId: string;
  selectedPlanId: string;
  selectedExerciseId: string;
  selectedSessionId: string;
  assistantScope?: 'global' | 'contextual';
  contextSurface?: 'patient' | 'clinical-record' | 'plan' | 'exercise' | 'report';
  now: string;
};

export type ToolInvocation<TInput = unknown> = {
  tool: string;
  version: 1;
  input: TInput;
  references: EntityRef[];
  proposalId: string;
  authorization?: 'explicit-user-request' | 'file-derived';
};

export type ClarificationRequest = {
  code: 'ENTITY_NOT_FOUND' | 'ENTITY_AMBIGUOUS' | 'ENTITY_RELATION_INVALID' | 'INPUT_INVALID';
  message: string;
  entityType?: EntityType;
  candidates?: Array<{ id: string; label: string }>;
};

export type ConfirmationMode = 'none' | 'review' | 'explicit' | 'reinforced' | 'blocked';

export type PolicyDecision = {
  mode: ConfirmationMode;
  fingerprint: string;
  reason: string;
};

export type ConfirmationProof = {
  id: string;
  fingerprint: string;
  mode: 'review' | 'explicit' | 'reinforced';
  confirmedAt: string;
  expiresAt: string;
};

export type AffectedEntity = {
  type: EntityType;
  id: string;
  beforeUpdatedAt?: string;
  afterUpdatedAt?: string;
};

export type UndoPatch =
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

export type UndoReceipt = {
  id: string;
  transactionId: string;
  tool: string;
  issuedAt: string;
  expiresAt: string;
  consumedAt?: string;
  patches: UndoPatch[];
  generatedEventIds: string[];
  generatedNotificationIds: string[];
};

export type ClientEffect =
  | { type: 'download'; filename: string; mimeType: string; content: string }
  | { type: 'navigate'; href: string }
  | { type: 'theme'; mode: 'light' | 'dark' | 'system' }
  | { type: 'session-draft'; operation: 'start' | 'update' | 'complete'; patientId: string; planId: string; draft: Record<string, unknown> }
  | { type: 'delivery'; action: 'open' | 'download' | 'share' | 'print'; planId: string; options?: Record<string, unknown> }
  | { type: 'exercise-media'; exerciseId: string; mediaType: 'image' | 'sequence'; artifactIds: string[] };

export type ToolSuccess<TData = unknown> = {
  status: 'success';
  message: string;
  summary: string[];
  data?: TData;
  href?: string;
  affected: AffectedEntity[];
  undo?: UndoReceipt;
  clientEffect?: ClientEffect;
};

export type ToolExecutionResult<TData = unknown> =
  | ToolSuccess<TData>
  | { status: 'clarification'; clarification: ClarificationRequest }
  | { status: 'confirmation-required'; decision: PolicyDecision; invocation: ToolInvocation }
  | { status: 'blocked'; code: string; message: string }
  | { status: 'error'; code: string; message: string };

export type ResolvedEntities = {
  patient?: PatientEntity;
  clinicalRecord?: ClinicalRecord;
  plan?: PlanEntity;
  exercise?: ExerciseEntity;
  session?: SessionRecord;
  settings?: AppSettings;
};

export type ResolutionResult =
  | { status: 'resolved'; entities: ResolvedEntities }
  | { status: 'clarification'; clarification: ClarificationRequest };

export type ToolExecutionEnvironment = {
  state: AtalState;
  context: ExecutionContext;
  resolved: ResolvedEntities;
  transactionId: string;
};

export type ToolDefinition<TInput = unknown, TData = unknown> = {
  name: string;
  version: 1;
  description?: string;
  blockedReason?: string;
  risk: ToolRisk;
  mutates: boolean;
  supportsUndo: boolean;
  undoTtlMs?: number;
  requiredEntities: EntityType[];
  validateInput(input: unknown): TInput;
  preconditions(environment: ToolExecutionEnvironment, input: TInput): void;
  execute(environment: ToolExecutionEnvironment, input: TInput): ToolSuccess<TData>;
};

export type TransactionRequest<TInput = unknown, TData = unknown> = {
  definition: ToolDefinition<TInput, TData>;
  invocation: ToolInvocation<TInput>;
  context: ExecutionContext;
  resolved: ResolvedEntities;
  confirmation?: ConfirmationProof;
};

export type TransactionOutcome<TData = unknown> = ToolSuccess<TData> & {
  transactionId: string;
  committedAt: string;
};

export type StorePort = {
  read(): AtalState;
  mutate(mutator: (state: AtalState) => void): void;
};

export class CoreExecutionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'CoreExecutionError';
  }
}

export function coreError(code: string, message: string): CoreExecutionError {
  return new CoreExecutionError(code, message);
}
