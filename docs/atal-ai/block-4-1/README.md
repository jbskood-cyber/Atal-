# Atal AI — Block 4.1 canonical contract

## Status

- Canonical issue: [#13 — Block 4.1: Universal Atal AI core](https://github.com/jbskood-cyber/Atal-/issues/13)
- Base branch: `main`
- Base SHA: `243784ea47a2094d6b44bce5f165cfd53e2c76b6`
- Working branch: `feature/atal-ai-core-block-4-1`
- Previous block: 4.0 closed through PR #12
- Baseline already observed before this block: `npm ci`, typecheck, 43/43 tests and production build passed.

This directory is the canonical implementation contract for Block 4.1. A chat prompt, PR comment or implementation note may add execution context, but may not weaken or contradict these documents.

## Required reading order

1. `01-product-and-scope-contract.md`
2. `02-core-architecture.md`
3. `03-tools-risk-and-confirmation-matrix.md`
4. `04-transactions-audit-and-undo.md`
5. `05-implementation-plan.md`
6. `06-test-and-acceptance-matrix.md`
7. `07-autonomous-execution-protocol.md`

## Contract self-review decisions

The package was reviewed for placeholders, internal consistency, scope and type-name drift before opening the draft PR.

Two details are authoritative during implementation:

1. The final `UndoPatch`, `UndoReceipt` and `ToolDefinition` shapes are the definitions in `02-core-architecture.md`, consistent with `04-transactions-audit-and-undo.md`.
2. When creating `tests/tsconfig.core.json` in Task 1, add `"rootDir": ".."` under `compilerOptions`. This preserves emitted paths such as `.tmp/core-tests/src/features/atal-ai/core/stableValue.js`, which are used by `tests/helpers/core-modules.mjs`. This sentence corrects the Task 1 JSON example if that property is absent there.

No `TBD`, `TODO`, unspecified external dependency or store migration is authorized by this contract.

## Precedence

When two instructions appear to conflict, apply this order:

1. Protection of existing user data and clinical invariants.
2. The explicit contract self-review decisions in this README.
3. The final type/transaction contracts in documents 02 and 04.
4. Product and tool policy in documents 01 and 03.
5. Test and acceptance requirements in document 06.
6. Task sequencing and code examples in document 05.
7. Issue #13 acceptance criteria.
8. Draft PR checklist and checkpoint comments.
9. Execution-chat instructions.
10. Implementation convenience.

The worker must stop rather than guess when a conflict remains after applying this order.

## Objective

Build a deterministic, typed, auditable and reversible execution core for Atal AI. Gemini may propose structured intentions and arguments. Only the local core may resolve entities, classify risk, request confirmation, execute mutations, validate invariants, persist results, produce audit evidence and issue undo receipts.

Block 4.1 is an architectural foundation. It does not attempt to expose an AI assistant on every screen and does not add every possible application tool. It must first make the existing Atal AI operations safe and extensible.

## Existing architecture that must be protected

- Persistent store key: `atal:store:v2`.
- Store version: `2`.
- State includes patients, plans, exercises, clinical records and versions, sessions, notes, events, notifications, settings and feedback.
- `mutateAtalStore` currently clones the full state before mutation and restores the previous in-memory cache when persistence throws.
- Existing manual creation and editing flows remain authoritative product capabilities.
- Existing Atal AI code currently uses `commandRegistry.ts` and `applyDraft.ts`; Block 4.1 must adapt these flows without a big-bang rewrite.
- Existing AI conversations and drafts remain locally persisted and recoverable.

## Non-negotiable constraints

- Do not change `ATAL_STORE_KEY` or `ATAL_STORE_VERSION`.
- Do not delete or reset existing local data.
- Do not add a backend, Supabase, authentication, payments, external messaging or new secrets.
- Do not let model output call store mutators directly.
- Do not execute a write when entity resolution is ambiguous.
- Do not infer clinical facts that the user or stored data did not provide.
- Do not create a second active plan for the same patient.
- Do not duplicate an existing patient, exercise or plan merely because the model supplied a similar label.
- Do not perform a destructive or sensitive action without the required explicit confirmation.
- Do not remove current conflict/version checks.
- Do not perform a broad visual redesign.
- Do not merge or mark the PR ready without independent validation and explicit authorization.

## Definition of done

Block 4.1 is complete only when:

- the current 43-test baseline still passes;
- new tests cover contracts, entity ambiguity, risk policy, confirmations, transactions, rollback, audit and undo;
- every migrated Atal AI write travels through the Tool Registry and transaction engine;
- reads remain side-effect free;
- manual workflows remain functional;
- `atal:store:v2` data survives reload and migration behavior is unchanged;
- no duplicate or invalid relationships are introduced;
- CI, typecheck, tests and build pass on the final SHA;
- functional QA verifies representative query, draft, reversible-write and sensitive-write flows;
- the PR contains checkpoint evidence and remains in draft until final approval.
