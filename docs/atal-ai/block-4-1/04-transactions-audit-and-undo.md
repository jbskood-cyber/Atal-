# Block 4.1 — Transactions, audit and undo

## 1. Purpose

Atal AI writes must be all-or-nothing. A composite action may touch a patient, record, record-version history, exercises, plan, activity events and notifications. A failure at any point must leave all persisted collections exactly as they were before execution.

The existing store already provides a useful base:

```ts
export function mutateAtalStore(mutator: (draft: AtalState) => void) {
  const previous = loadState();
  const next = structuredClone(previous);
  mutator(next);
  next.updatedAt = now();
  try {
    localStorage.setItem(ATAL_STORE_KEY, JSON.stringify(next));
    cache = next;
    emit();
    return next;
  } catch (error) {
    cache = previous;
    throw error;
  }
}
```

Block 4.1 must preserve that behavior and run one complete AI mutation inside one invocation of `mutateAtalStore`.

## 2. Transaction contract

```ts
export type TransactionRequest<TInput> = {
  definition: ToolDefinition<TInput>;
  invocation: ToolInvocation<TInput>;
  context: ExecutionContext;
  resolved: ResolvedEntities;
  confirmation?: ConfirmationProof;
};

export type TransactionOutcome<TData = unknown> = ToolSuccess<TData> & {
  transactionId: string;
  committedAt: string;
};
```

Public entry point:

```ts
export function executeMutationTransaction<TInput, TData>(
  request: TransactionRequest<TInput>,
): TransactionOutcome<TData>;
```

The function must throw only typed internal `CoreExecutionError` values. `executionEngine` converts them to user-safe result unions.

## 3. Exact transaction sequence

1. Validate that the tool is registered and `mutates === true`.
2. Validate confirmation proof against registry-owned risk.
3. Generate `transactionId` and `committedAt` from the injected/context clock.
4. Enter exactly one `mutateAtalStore` call.
5. Inside the candidate cloned state:
   - resolve current affected entities again by ID;
   - verify base versions and relationships;
   - capture minimal before snapshots;
   - run tool preconditions;
   - execute the deterministic state mutation;
   - compute affected entity after versions;
   - validate complete state invariants;
   - build an undo receipt when supported;
   - append one transaction-level audit event;
6. Return from the mutator.
7. Allow existing store persistence to write the complete candidate.
8. Return the transaction outcome to the conversation adapter.

Do not persist confirmation proofs, model prompts, attachment bytes or private contact data in the audit event.

## 4. Required implementation shape

```ts
export function executeMutationTransaction<TInput, TData>(
  request: TransactionRequest<TInput>,
): TransactionOutcome<TData> {
  const transactionId = createTransactionId();
  const committedAt = request.context.now;
  let outcome: TransactionOutcome<TData> | undefined;

  mutateAtalStore((candidate) => {
    const environment = createEnvironment(candidate, request, transactionId);
    request.definition.preconditions(environment, request.invocation.input);

    const before = captureBeforeSnapshots(
      candidate,
      request.definition,
      request.resolved,
    );

    const success = request.definition.execute(
      environment,
      request.invocation.input,
    );

    validateAtalStateInvariants(candidate);

    const affected = resolveAffectedAfter(candidate, success.affected);
    const undo = request.definition.supportsUndo
      ? createUndoReceipt({
          transactionId,
          tool: request.definition.name,
          before,
          affected,
          issuedAt: committedAt,
        })
      : undefined;

    appendTransactionAudit(candidate, {
      transactionId,
      tool: request.definition,
      context: request.context,
      confirmation: request.confirmation,
      affected,
      undo,
      committedAt,
    });

    outcome = {
      ...success,
      affected,
      undo,
      transactionId,
      committedAt,
    };
  });

  if (!outcome) {
    throw coreError('CORE_EXECUTION_FAILED', 'No se completó la transacción.');
  }

  return outcome;
}
```

The final implementation may split helpers into focused files, but must preserve this ordering.

## 5. Prohibited transaction patterns

- Calling `mutateAtalStore` more than once for one tool invocation.
- Calling manual store mutation functions from inside a tool when those functions themselves call `mutateAtalStore`.
- Writing events or notifications before all preconditions pass.
- Persisting an audit success outside the same store transaction.
- Catching an invariant failure and continuing.
- Returning partial success.
- Performing browser download, navigation, React state updates or network calls inside the transaction.
- Using `Date.now()` independently in several domain executors; use the injected transaction time.
- Generating different entity IDs on retries of the same in-flight transaction without creating a new proposal.

## 6. State invariants

`validateAtalStateInvariants(candidate)` must produce stable error codes and testable messages. It validates the complete candidate before persistence.

### 6.1 Collection integrity

- `state.version === 2`.
- all expected collections are arrays;
- entity IDs are non-empty and unique within each collection;
- `updatedAt`, `createdAt` and session timestamps are valid ISO strings when required;
- no `undefined` entity entry exists in an array.

### 6.2 Relationships

- every plan patient exists;
- every plan exercise exists;
- every clinical record patient exists;
- every clinical record `planId`, when non-empty, exists and belongs to the same patient;
- every clinical record version references an existing record ID or the record being updated in the same candidate;
- every session patient and plan exist;
- every session plan belongs to the session patient;
- every note patient exists;
- event and notification references may be absent, but when present must not be changed to a known-invalid ID by the transaction.

### 6.3 Product rules

- at most one active plan per patient;
- an active plan contains at least one exercise;
- plan status is one of the current allowed values;
- exercise status is allowed;
- exercise sets are at least `1`;
- pain values remain within current product bounds when present;
- existing entity updates preserve ID and original `createdAt`;
- record version increments by exactly one on update;
- a record update creates exactly one pre-update version snapshot;
- a new record starts at version `1`.

### 6.4 Transaction-specific validation

The engine also checks:

- every `affected` ID exists after success unless the action intentionally removed a newly created entity during undo;
- no entity outside the tool's declared affected collections changed, excluding expected events, notifications and store `updatedAt`;
- a read tool cannot enter the transaction engine;
- an undo receipt includes only allowlisted collections.

## 7. Before snapshot capture

Capture only what is needed to reverse this transaction. Do not store the full Atal state in the conversation.

```ts
export type CapturedBefore = {
  collection: UndoPatch['collection'];
  entityId: string;
  existed: boolean;
  value: unknown;
};
```

Rules:

- existing updated entities store their previous full entity value;
- newly created entities store `existed: false` and their generated ID;
- composite tools include all created/updated patient, record, plan and exercise entities;
- record-version entries created by the transaction are included as removable created entries;
- settings capture only allowlisted changed keys;
- events and notifications generated by the transaction are removed by IDs in undo metadata, not by deleting unrelated newest entries.

To support created-entry reversal, use patches such as:

```ts
export type UndoPatch =
  | {
      operation: 'restore';
      collection: 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'settings';
      entityId: string;
      before: unknown;
      expectedAfterUpdatedAt?: string;
    }
  | {
      operation: 'remove-created';
      collection: 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'clinicalRecordVersions' | 'notes' | 'events' | 'notifications';
      entityId: string;
      expectedAfterUpdatedAt?: string;
    };
```

The implementation should update the earlier simplified contract accordingly and keep one authoritative exported type.

## 8. Undo receipt

```ts
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
```

Default expiry: 30 seconds, preserving current product behavior. A tool may use a shorter duration but not a longer duration in Block 4.1 without updating this contract.

The receipt is returned to and persisted with the AI conversation result. It is not placed in a new global receipt collection.

## 9. Undo execution

Public entry point:

```ts
export function executeUndo(
  receipt: UndoReceipt,
  context: ExecutionContext,
): TransactionOutcome<{ undoneTransactionId: string }>;
```

Sequence:

1. reject missing/expired/consumed receipt;
2. verify receipt belongs to the conversation result invoking undo;
3. enter one `mutateAtalStore` call;
4. verify each current entity still matches the receipt's expected post-transaction version;
5. apply restore patches in dependency-safe order;
6. remove created entities only when no later entity now references them;
7. remove only event/notification IDs generated by the original transaction where appropriate;
8. validate complete invariants;
9. append one `ai_applied` event with `outcome: 'undone'` and original transaction ID;
10. persist and return success;
11. clear/invalidate the receipt in conversation state after success.

Dependency-safe restoration order:

1. settings;
2. exercises;
3. plans;
4. clinical records;
5. patients;
6. created record versions/notes/events/notifications cleanup.

For removal of composite created data, reverse dependency order:

1. notifications/events/record versions/notes;
2. plans;
3. clinical records;
4. exercises created only for the transaction and unused elsewhere;
5. patient.

If a newly created exercise is now referenced by another later plan, undo is stale and must fail rather than delete it.

## 10. Audit event

One transaction-level event must be appended for every successful AI mutation and undo.

```ts
export type AITransactionAudit = {
  kind: 'ai_applied';
  origin: 'atal-ai';
  title: string;
  detail: string;
  transactionId: string;
  toolName: string;
  toolVersion: 1;
  riskLevel: ToolRisk;
  confirmationId?: string;
  affectedEntities: Array<{ type: EntityType; id: string }>;
  outcome: 'success' | 'undone';
  undoReceiptId?: string;
  conversationId: string;
  draftId: string;
  createdAt: string;
};
```

Audit requirements:

- title and detail are human-readable and concise;
- no attachment payloads;
- no private contact fields;
- no full patient/record snapshots;
- no model prompt or hidden reasoning;
- no false success for a blocked, clarification or failed transaction;
- exactly one transaction-level event per successful transaction;
- existing domain events may also exist, but duplicate generic `Atal IA aplicado` events must be eliminated during migration.

## 11. Failure and rollback tests

Tests must inject failures at these points and assert deep equality with pre-state:

- input validation;
- unresolved entity;
- stale base version;
- tool precondition;
- after first composite entity creation;
- after exercise creation but before plan creation;
- invariant validation;
- `localStorage.setItem` failure;
- stale undo receipt;
- undo invariant failure.

For every failure assert:

- persisted `atal:store:v2` unchanged;
- in-memory state unchanged;
- no new audit event;
- no new notification;
- no partial patient/record/plan/exercise;
- no consumed confirmation proof;

## 12. Concurrency/version behavior

Block 4.1 remains local-first and single-tab-oriented, but storage events can update cache across tabs. Therefore every write re-checks entity versions inside the transaction candidate, not only before it.

A reviewed proposal uses base versions. If state changed after review:

- return `CORE_VERSION_CONFLICT`;
- do not mutate;
- do not automatically refresh and execute;
- let the user refresh/compare and create a new proposal fingerprint.
