# Block 4.1 — Product and scope contract

## 1. Product intent

Atal is a mobile-first clinical workspace for physiotherapists. Its main product circuit is:

`patient → clinical record → treatment plan → exercises → guided patient session → report → physiotherapist review → Atal AI operational support`

Atal AI is not a second database and is not an autonomous clinician. It is an operational interface over the same deterministic product capabilities available through the manual UI.

The long-term direction is for the user to operate Atal through text, audio, images and PDFs. Block 4.1 does not deliver that complete surface. It delivers the safe execution foundation required before broader contextual assistants can be added.

## 2. Goal

Create one universal local execution core that converts a validated structured proposal into one of five outcomes:

1. a side-effect-free result;
2. a reviewable draft;
3. a confirmation request;
4. an atomic executed result with audit evidence;
5. a deterministic clarification or error.

The core must be reusable by the existing global Atal AI screen and by future contextual assistants without duplicating execution logic.

## 3. In scope

### 3.1 Core contracts

Define explicit contracts for:

- tool identity and version;
- input and output types;
- execution context;
- entity references and resolved entities;
- risk classification;
- confirmation requirements;
- validation/precondition failures;
- transaction outcomes;
- audit records;
- undo receipts;
- clarification requests.

### 3.2 Tool Registry

Create a single typed registry that is the only supported lookup path from a model-proposed tool name to executable application behavior.

Each tool definition must declare:

- stable name;
- version;
- description for internal orchestration;
- risk level;
- required entity types;
- whether the tool is read-only, draft-only or mutating;
- input validator;
- precondition validator;
- executor;
- audit metadata builder;
- undo capability and expiry, when applicable.

### 3.3 Entity resolution

Resolve patients, plans, exercises, sessions and clinical records using deterministic precedence:

1. explicit valid ID in tool input;
2. valid selected entity in active work context;
3. unique exact normalized match;
4. unique constrained match inside an already resolved parent entity;
5. otherwise clarification, never mutation.

### 3.4 Risk and confirmation

Replace ad-hoc command classification with a fixed policy owned by code, not by Gemini. The registry and policy engine decide whether a proposal may execute immediately, must remain a draft, needs standard confirmation, needs reinforced confirmation or is blocked in this block.

### 3.5 Transactions, audit and undo

All writes must execute through one transaction boundary over the existing store. The boundary must preserve the current full-state clone/persist behavior, add explicit invariant validation, emit a structured audit record and return an undo receipt when supported.

### 3.6 Migration of existing Atal AI operations

Migrate the current operations without changing their approved user-facing behavior:

- search patient;
- summarize patient;
- summarize sessions;
- prepare a report summary;
- add a patient note;
- activate, pause, complete, archive and restore a plan;
- replace an active plan;
- export local data;
- update allowed settings;
- apply supported patient/record/plan/exercise drafts.

The existing UI may retain adapters during the migration, but those adapters must call the new core instead of duplicating business mutation logic.

### 3.7 Quality safety net

Add repository CI for clean install, typecheck, all tests and production build. Extend the test suite with deterministic core tests and preserve all existing tests.

## 4. Explicitly out of scope

- AI trigger or assistant panel on every application screen.
- A new conversational UI or visual redesign.
- New backend persistence or cloud synchronization.
- Supabase, authentication, Google login, payments or deployment work.
- Email, WhatsApp, push delivery or other external side effects.
- Autonomous diagnosis, prognosis or clinical prescription.
- Model-selected risk levels.
- Silent destructive actions.
- Store version migration from v2.
- Replacing the existing local store with a new state library.
- Broad refactoring unrelated to the execution core.
- Performance optimization of the 606.97 kB production bundle, except avoiding additional unnecessary weight.

## 5. User-visible behavior contract

### 5.1 Queries

Queries run without confirmation only when they are side-effect free and all required entities resolve uniquely. The result must state what was found and may include a navigation target.

### 5.2 Drafts

A draft is editable and persistable but must not alter real entities until the user chooses `Aplicar cambios`. Saving a draft section changes only the draft.

### 5.3 Reversible writes

A reversible write requires the existing review/apply interaction. After successful execution, Atal must show a clear summary and an undo action while the receipt is valid.

### 5.4 Sensitive writes

A sensitive write requires an explicit confirmation screen naming the action and affected entity. Confirmation must be scoped to the exact proposal fingerprint; changing inputs invalidates the previous confirmation.

### 5.5 Destructive writes

Destructive writes require reinforced confirmation. Block 4.1 should register only destructive operations already supported and proven by the product. It must not invent permanent deletion tools.

### 5.6 External actions

External actions are registered as blocked/not available in Block 4.1. The model receives a deterministic unsupported result and cannot simulate delivery.

### 5.7 Ambiguity

When multiple entities match, Atal must ask the user to choose. It must never choose the first array item, the newest item or a fuzzy match for a write.

## 6. Clinical and data safety invariants

The transaction must fail and leave persisted state unchanged when any invariant is violated:

- IDs remain unique within each entity collection.
- Every plan references an existing patient.
- Every clinical record references an existing patient.
- Every session references an existing patient and plan, and that plan belongs to that patient.
- Every plan exercise ID references an existing exercise.
- A patient has at most one active plan.
- Updating an existing entity preserves its ID and original creation timestamp.
- Clinical record version increments exactly once per successful update.
- A version snapshot is created before a clinical record update.
- Existing version-conflict checks remain effective.
- A failed mutation creates no event, notification, audit entry or partial entity.
- A successful mutation creates one transaction-level audit entry; domain events may still be emitted by existing store functions.
- Undo applies only to the transaction and entity versions described by its receipt.

## 7. Compatibility contract

The following must remain compatible:

- `ATAL_STORE_KEY === 'atal:store:v2'`.
- `ATAL_STORE_VERSION === 2`.
- Existing persisted state shape and legacy merge behavior.
- Existing routes and manual CRUD workflows.
- Existing AI conversation and draft persistence.
- Existing UI copy and visual hierarchy except minimal states required to represent clarification/confirmation/result.
- Existing plan/clinical-record association behavior.
- Existing data export formats unless a test proves a bug that must be fixed within scope.

## 8. Success criteria

Block 4.1 succeeds when a future contextual assistant can invoke the same registry with a different `ExecutionContext` and receive the same deterministic safety behavior as the global Atal AI screen.

It fails when any migrated operation can bypass the registry, when a model-generated risk level is trusted, when ambiguous writes execute, when rollback is partial, or when existing local data/manual workflows regress.
