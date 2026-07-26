# Atal Behavior System — Shared Action Core Design

## Objective

Make Atal behave as one coherent product regardless of whether an action is initiated from the normal UI, Atal IA general, or a contextual Atal IA surface.

The core rule is simple:

> One user intention must have one canonical domain behavior.

The UI and AI may differ in how they gather intent, request confirmation, and present results, but they must not implement different state mutations for the same action.

## Verified current-state findings

Audit base:

- Repository: `jbskood-cyber/Atal-`
- Existing Linear-style agent branch: `feature/atal-ai-linear-agent`
- Audited HEAD: `1b1a49eb23f6bd135f27906b0321a2d8b481ba8d`
- Existing PR: #19, draft, unmerged
- Behavior System branch: `feature/atal-behavior-system`

Current CI on the audited PR #19 HEAD is green for the `quality` and `e2e` workflows.

### AI mutation path

Atal IA already has a strong deterministic execution path:

`agentController -> executeToolInvocation -> risk/entity resolution -> executeMutationTransaction -> atalStore`

That path provides validation, context restrictions, invariants, atomic mutation, audit metadata and Undo receipts.

### Manual UI mutation path

Normal UI flows do not consistently use that path. Examples found during the audit:

- `src/data/localPatients.ts` calls store primitives such as `createPatient`, `updatePatient`, `setPatientArchived` and `mutateAtalStore` directly.
- `src/data/localPlans.ts` calls `createPlan`, `updatePlan`, `updatePlanStatus` and `mutateAtalStore` directly.
- `src/data/localExercises.ts` calls `createExercise`, `updateExercise`, `archiveExercise`, `deleteExercise` and duplicate helpers directly.
- `src/features/clinical-record/ClinicalRecordScreen.tsx` saves through `createClinicalRecord` / `updateClinicalRecord` instead of the AI execution core.

### Proven semantic divergence

Archiving a patient has two different meanings today:

- Manual UI (`archiveLocalPatient`) archives the patient, pauses every active plan for that patient, updates timestamps, and records plan-paused events.
- AI tool (`patient.lifecycle`) only changes the patient status and timestamp.

This is not a visual problem. It is a behavior-system problem.

## Non-goals

This block must NOT:

- redesign Atal visually;
- replace the current Atal IA conversation architecture;
- merge general and contextual conversation histories;
- change `atal:store:v2` persistence format without an explicit migration need;
- introduce backend/auth/payment work;
- make ordinary manual form saves depend on an LLM;
- force AI-specific confirmation mechanics onto normal direct UI editing;
- rebuild existing screens when a narrow adapter change is sufficient.

## Architecture

The migration is intentionally incremental to avoid another broad rewrite.

### Layer 1 — Canonical domain behaviors

Create a small `src/domain/actions/` module family containing pure, deterministic state-changing functions for core clinical actions.

A domain behavior receives:

- the mutable `AtalState` candidate;
- already-resolved entity IDs or direct IDs;
- validated domain input;
- an explicit execution context (`now`, origin, optional transaction ID).

It returns:

- affected entities;
- domain-level result data;
- optional navigation target / summary metadata where useful.

It must not know about Gemini, tool calls, React, routing hooks, or screen components.

### Layer 2 — Shared action transaction executor

Generalize the existing mutation transaction guarantees so they are not AI-only.

The executor owns:

- before snapshot;
- atomic mutation;
- state invariant validation;
- affected-entity verification;
- Undo patch generation;
- audit event creation;
- transaction result.

The executor receives an origin descriptor rather than assuming `atal-ai`.

Canonical origins:

- `manual-ui`
- `atal-ai-general`
- `atal-ai-contextual`
- `system`

AI-specific conversation/draft IDs remain optional metadata, not requirements for every action.

### Layer 3 — Adapters

#### Manual UI adapter

Existing repositories/screens remain the public APIs used by screens during migration, but their write functions delegate to canonical actions rather than implementing independent domain semantics.

Manual UI keeps its own explicit user interaction model:

- clicking Save is already confirmation of a normal reversible edit;
- destructive/sensitive UI actions keep their existing dialog/sheet confirmation;
- the shared executor provides audit and Undo capability without requiring a proposal ID.

#### AI adapter

`executeToolInvocation` remains responsible for:

- tool schema validation;
- entity resolution;
- contextual scope restrictions;
- risk policy;
- AI confirmation proof.

Once those gates pass, mutating tools delegate to the same canonical domain behaviors used by the manual UI.

The LLM never becomes the authority for domain semantics.

## Canonical behavior contracts

The first ten product behaviors to converge are:

1. **Create patient** — patient is created with canonical defaults and no duplicate-name ambiguity.
2. **Update patient** — demographics/contact edits preserve immutable identity fields.
3. **Archive / restore patient** — archive semantics are identical from UI and AI, including active-plan consequences.
4. **Create / update clinical record** — versioning and plan association behave identically from UI and AI.
5. **Create plan** — active-plan conflict policy is shared.
6. **Update plan fields** — direct field edits preserve identity and associations.
7. **Change plan lifecycle** — activate, pause, complete, archive and restore use one conflict/state machine.
8. **Change plan exercise membership** — add/remove/reorder uses one invariant set; an active plan cannot become invalid.
9. **Create / update / lifecycle exercise** — numeric normalization and archive semantics are shared; media side effects remain outside the pure state action.
10. **Register/complete guided session** — session completion and resulting activity/progress state use one domain behavior.

Undo is cross-cutting, not a separate domain action. A successful reversible mutation should expose an Undo receipt regardless of whether it came from UI or AI.

## Behavior parity rules

For every canonical action, tests must prove:

1. Manual and AI adapters invoke the same canonical behavior.
2. Given the same starting state and validated intent, final domain state is equivalent apart from allowed origin/audit metadata.
3. Invalid transitions fail before persistence.
4. No action leaves references broken.
5. Reversible writes produce a valid Undo receipt.
6. Undo restores the domain state unless a later conflicting edit makes the receipt stale.
7. Contextual AI cannot mutate entities outside its scope.
8. General and contextual conversation storage remain isolated.

## Audit model

The current transaction engine hard-codes an `ai_applied` event. This must become source-aware while preserving compatibility with existing activity rendering.

New audit data must make it possible to answer:

- what action happened;
- when;
- what initiated it;
- which entities changed;
- whether the action can be undone;
- AI conversation/draft/tool metadata when applicable.

No fake or duplicate activity records should be produced merely because both an adapter and the shared transaction executor ran.

## Media and external side effects

Exercise media storage is not part of the atomic `AtalState` transaction. The canonical exercise behavior governs state semantics; media copy/delete remains an orchestration concern.

Rules:

- do not put IndexedDB/media I/O inside pure domain actions;
- preserve current rollback behavior for failed media duplication;
- state must never reference a media object that failed to persist;
- AI may only request client effects through the existing client-effect boundary.

## Rollout strategy

Migration order:

1. Establish source-aware shared transaction/action contracts and tests.
2. Converge patient lifecycle first because a verified semantic divergence already exists.
3. Converge patient update/create and clinical record behavior.
4. Converge plans and plan membership.
5. Converge exercises while preserving media orchestration.
6. Converge guided-session completion.
7. Replace remaining direct mutation duplicates where the migrated actions cover them.
8. Add adapter-parity and end-to-end tests for the ten behaviors.
9. Run complete quality/e2e regression and visual/function validation.

Each migration step must be independently testable and must not depend on a later visual redesign.

## Acceptance criteria

This block is complete only when:

- the ten core behaviors have canonical implementations;
- UI and AI routes no longer encode conflicting semantics for those behaviors;
- manual and AI mutations use shared transactional invariants and audit/Undo guarantees where applicable;
- `atal:store:v2` remains backward compatible;
- Atal IA general and contextual instances remain separated;
- all existing core tests pass;
- all relevant E2E tests pass;
- new parity tests pass;
- production build passes;
- no regression requires rebuilding existing screens;
- final behavior documentation identifies any intentionally remaining direct write path and why it is safe.

## Guiding product principle

Atal should feel like Linear not because it visually imitates Linear, but because every object and action obeys a predictable system: one action, one meaning, immediate state reflection, clear failure behavior, traceability, and reversible changes when safe.
