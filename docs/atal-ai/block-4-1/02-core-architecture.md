# Block 4.1 — Core architecture

## 1. Architectural decision

Use a **typed registry plus deterministic execution pipeline** layered over the current local store. Do not replace the store, introduce a second state source or perform a big-bang rewrite.

The required flow is:

```text
Gemini structured proposal
  → legacy/draft adapter
  → ToolInvocation validation
  → entity resolution
  → registry lookup
  → risk and confirmation policy
  → transaction or read executor
  → invariant validation
  → persistence
  → structured audit
  → result + optional undo receipt/client effect
  → existing Atal AI conversation UI
```

Gemini is upstream of the trust boundary. Everything after `ToolInvocation validation` is deterministic application code.

## 2. Current modules and migration responsibility

### `src/features/atal-ai/types.ts`

Current AI conversation, draft and command shapes. Keep existing exported types compatible. Add core types in a separate module and use adapters instead of overloading legacy types with execution responsibilities.

### `src/features/atal-ai/data/commandRegistry.ts`

Currently combines command classification, entity fallback, query logic, mutations, local export, audit and undo. During Block 4.1 it becomes a compatibility adapter. Its public exports may remain temporarily, but implementation must delegate to the new execution engine.

### `src/features/atal-ai/data/applyDraft.ts`

Currently applies composite draft changes directly through `mutateAtalStore`. Extract its deterministic state transformation into typed tool executors. Keep a compatibility wrapper only while the current conversation screen still imports it.

### `src/features/atal-ai/AtalAIConversationScreen.tsx`

Keep presentation and conversation orchestration. Replace direct calls to legacy execution functions with the new engine through a small adapter. Do not put resolution, risk or mutation logic in the React component.

### `src/data/atalStore.ts`

Remain the only source of persisted product state. Preserve `ATAL_STORE_KEY`, store version, loading, legacy merge, subscriptions and existing public manual APIs. The core transaction engine must use `mutateAtalStore` exactly once per mutating tool.

## 3. Target file structure

```text
src/features/atal-ai/core/
├── contracts.ts
├── stableValue.ts
├── toolRegistry.ts
├── entityResolver.ts
├── riskPolicy.ts
├── stateInvariants.ts
├── transactionEngine.ts
├── undoEngine.ts
├── executionEngine.ts
├── legacyAdapters.ts
└── tools/
    ├── queryTools.ts
    ├── patientTools.ts
    ├── planTools.ts
    ├── exerciseTools.ts
    ├── settingsTools.ts
    └── exportTools.ts
```

Each file has one responsibility:

- `contracts.ts`: shared discriminated unions and generic interfaces. No store imports and no side effects.
- `stableValue.ts`: canonical key ordering, stable serialization, normalized labels and deterministic proposal fingerprint. No React/browser state.
- `toolRegistry.ts`: registration, duplicate-name protection, lookup and registry completeness checks. It does not execute tools.
- `entityResolver.ts`: resolve and validate entity relationships from a snapshot plus context. It never mutates state.
- `riskPolicy.ts`: map registry-owned risk to a gate result. It never trusts model-provided risk.
- `stateInvariants.ts`: validate the complete candidate `AtalState`; throw typed invariant failures before persistence.
- `transactionEngine.ts`: one `mutateAtalStore` boundary, executor invocation, invariant validation, audit append and result construction.
- `undoEngine.ts`: validate receipt expiry/current versions and restore previous values in one transaction.
- `executionEngine.ts`: orchestrate validation, resolution, policy and execution; this is the only public core entry point.
- `legacyAdapters.ts`: translate current `AICommand`, `AtalAIDraft`, `AIWorkContext` and private contact data into typed invocations/results.
- `tools/*.ts`: focused deterministic definitions and executors grouped by product domain.

Do not add a React context, global event bus or second tool registry.

## 4. Core contracts

The implementation must define these exact concepts. Property names may be extended only when a test demonstrates need; existing names must not be silently renamed across tasks.

```ts
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
  now: string;
};

export type ToolInvocation<TInput = unknown> = {
  tool: string;
  version: 1;
  input: TInput;
  references: EntityRef[];
  proposalId: string;
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

export type AffectedEntity = {
  type: EntityType;
  id: string;
  beforeUpdatedAt?: string;
  afterUpdatedAt?: string;
};

export type UndoPatch = {
  collection: 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'settings';
  entityId: string;
  before: unknown;
  expectedAfterUpdatedAt?: string;
};

export type UndoReceipt = {
  id: string;
  transactionId: string;
  tool: string;
  issuedAt: string;
  expiresAt: string;
  patches: UndoPatch[];
};

export type ClientEffect =
  | { type: 'download'; filename: string; mimeType: string; content: string };

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
```

## 5. Tool definition boundary

```ts
export type ToolExecutionEnvironment = {
  state: AtalState;
  context: ExecutionContext;
  resolved: ResolvedEntities;
  transactionId: string;
};

export type ToolDefinition<TInput, TData = unknown> = {
  name: string;
  version: 1;
  risk: ToolRisk;
  mutates: boolean;
  requiredEntities: EntityType[];
  validateInput(input: unknown): TInput;
  preconditions(environment: ToolExecutionEnvironment, input: TInput): void;
  execute(environment: ToolExecutionEnvironment, input: TInput): ToolSuccess<TData>;
};
```

Tool executors receive the candidate cloned state only when `mutates === true`. They must not call `getAtalState`, `mutateAtalStore`, React setters, router APIs, browser downloads or Gemini.

Read tools receive an immutable snapshot and must be tested for zero state changes.

## 6. Resolution model

`resolveEntities(snapshot, invocation, context)` returns one of:

```ts
export type ResolutionResult =
  | { status: 'resolved'; entities: ResolvedEntities }
  | { status: 'clarification'; clarification: ClarificationRequest };
```

Rules:

1. Reject an explicit ID that does not exist; do not fall back to a label.
2. Use selected context only when the requested type matches and the entity exists.
3. Normalize labels with Unicode decomposition, diacritic removal, trim, lowercase and internal whitespace collapse.
4. A write requires a unique exact normalized label match.
5. A read may return multiple search results only when the tool itself is a search tool; this is not entity resolution.
6. Validate parent relations after resolution.
7. Never resolve by array position, approximate similarity, creation date or model confidence.

## 7. Policy model

The policy engine receives the registered definition, validated invocation, resolution and optional confirmation proof.

- `read` → `none`.
- `draft` → `review`; no real mutation.
- `reversible-write` → `review`; execution only after the user presses the existing apply control.
- `sensitive-write` → `explicit`; exact action/entity confirmation required.
- `destructive` → `reinforced`; exact action/entity plus consequence copy required.
- `external` → `blocked` in Block 4.1.

A confirmation proof is valid only when its fingerprint equals the current stable invocation fingerprint and it has not expired.

## 8. Transaction boundary

For a mutating tool, `transactionEngine` performs exactly one call to `mutateAtalStore`:

1. generate transaction ID;
2. enter the store clone supplied by `mutateAtalStore`;
3. capture only affected before snapshots for undo/audit;
4. run tool preconditions;
5. execute the tool against the candidate state;
6. validate all state invariants;
7. append one structured `ai_applied` audit event to the candidate state;
8. return from the mutator so existing persistence runs;
9. return result and undo receipt to the caller.

Any throw before step 8 leaves persisted state and cache unchanged through current store behavior.

## 9. Structured audit in existing events

Do not add a parallel audit store in this block. Extend `ActivityEvent` with optional backward-compatible fields:

```ts
transactionId?: string;
toolName?: string;
toolVersion?: number;
riskLevel?: ToolRisk;
confirmationId?: string;
affectedEntities?: Array<{ type: EntityType; id: string }>;
outcome?: 'success' | 'undone';
undoReceiptId?: string;
```

The event must not contain attachment bytes, private contact details, full clinical snapshots or secrets. `previousValue` and `nextValue` should be omitted from the transaction-level event when they could expose more clinical content than the existing activity UI needs.

## 10. Undo model

Undo is a new invocation through the same transaction and invariant machinery. It is not a direct assignment from the UI.

Before undo:

- receipt must exist and be unexpired;
- receipt tool/transaction must match the current conversation result;
- every entity with `expectedAfterUpdatedAt` must still have that value;
- each patch collection must be allowlisted;
- restoring the before values must pass all invariants.

On success, append an audit event with `outcome: 'undone'` and invalidate the receipt in conversation state.

## 11. Error model

Use typed internal errors with stable codes and user-safe messages:

- `CORE_INPUT_INVALID`
- `CORE_TOOL_UNKNOWN`
- `CORE_ENTITY_NOT_FOUND`
- `CORE_ENTITY_AMBIGUOUS`
- `CORE_ENTITY_RELATION_INVALID`
- `CORE_CONFIRMATION_REQUIRED`
- `CORE_CONFIRMATION_STALE`
- `CORE_PRECONDITION_FAILED`
- `CORE_VERSION_CONFLICT`
- `CORE_INVARIANT_FAILED`
- `CORE_UNDO_EXPIRED`
- `CORE_UNDO_STALE`
- `CORE_EXTERNAL_BLOCKED`
- `CORE_EXECUTION_FAILED`

Do not expose stack traces or raw model output in the UI.

## 12. Integration rule

`AtalAIConversationScreen` may call one adapter function such as:

```ts
executeLegacyAIAction({ draft, command, workContext, conversationId, privateContact, confirmation })
```

That adapter must produce a `ToolInvocation` and delegate to `executeToolInvocation`. The React screen handles only the returned union: clarification, confirmation, success, blocked or error.
