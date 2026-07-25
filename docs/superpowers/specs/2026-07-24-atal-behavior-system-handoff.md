# ATAL × Linear — Final Architecture & Handoff

Status: **READY_FOR_REVIEW — technically complete, unmerged**

Canonical implementation branch: `feature/atal-behavior-system`
Canonical PR: #20 — `refactor: unify Atal through shared behavior system`
Stacked base: `feature/atal-ai-linear-agent` / PR #19

## Objective achieved

Atal no longer relies on separate domain semantics for normal UI, general Atal IA and contextual Atal IA. Shared clinical intentions now converge on canonical domain actions, while each invocation surface keeps only the responsibilities that actually belong to it.

The final architecture is:

```text
Normal UI ─────────────┐
                       │
General Atal IA ───────┼──> canonical domain action
                       │          │
Contextual Atal IA ────┘          ▼
                         Action Transaction
                         validation / invariants
                         audit / persistence / Undo
                                  │
                                  ▼
                            atal:store:v2
```

Atal IA remains responsible for conversational interpretation, entity resolution, contextual scope, risk and confirmation. It is no longer the owner of duplicated clinical mutation semantics.

## Canonical behavior families

The Behavior System now has one domain family for the core product operations:

1. patient create/update;
2. patient lifecycle archive/restore;
3. clinical-record create/update/versioning;
4. plan create/update;
5. plan lifecycle and active-plan replacement;
6. plan exercise membership;
7. exercise create/update/duplicate/lifecycle;
8. guided-session start/completion and historical plan snapshot;
9. clinician session review;
10. professional settings and patient-note edits where equivalent UI/AI paths exist.

Local-only interactions such as notification read state and feedback remain local adapters because no genuine AI-equivalent product intent exists. They were deliberately not forced into an artificial abstraction.

## Transaction contract

Shared writes can execute through the source-aware Action Core. The transaction layer owns:

- deterministic snapshotting;
- clinical state invariants;
- rollback on failure;
- affected-entity validation;
- stable audit serialization;
- source attribution (`manual-ui`, `ai-general`, `ai-contextual`);
- Undo receipts for reversible operations;
- compatibility with the existing Atal IA risk/confirmation layer.

Atal IA's transaction engine is now an adapter over this shared infrastructure rather than a parallel write system.

## Conversation isolation contract

The Behavior System does **not** merge conversational instances.

- `/assistant` owns the general conversation history and composer.
- contextual assistants own a conversation bound by `conversationId + contextKey`.
- patient/plan/entity contextual threads do not appear in the general history.
- contextual read tools are restricted to the current surface and anchored related resources.
- a contextual mutation writes the shared clinical store, so its result becomes visible everywhere without sharing transcript state.

This preserves the Block 4.3 separation between **shared core** and **separate conversational instances**.

## 10/10 runtime behavior coverage

Phase 6 closes real browser coverage for all ten fundamental behavior groups. Representative direct UI and Atal IA paths are exercised wherever the product actually exposes both surfaces.

Important intentional asymmetry: patient-side guided-session start/completion has no invented AI command. Clinician review does have UI/AI parity and uses the same `applyReviewSession` behavior.

Full runtime evidence is documented in:

- `2026-07-24-atal-behavior-parity-matrix.md`
- `2026-07-24-atal-behavior-e2e-coverage.md`

Phase 6 closure evidence:

- product/test SHA: `936c7e405b614f04ad482cb2a1394a607ce03d38`
- `behavior-system-quality` #193 ✅
- `quality` #622 ✅
- `e2e` #598 ✅

`quality` includes TypeScript, Node tests and production build. Playwright executes the full `./e2e` belt.

## Defects found by browser validation

The final browser pass proved why this work needed real E2E rather than only architecture inspection.

### Escaped patient-create path

`NewPatientScreen` still used a legacy store primitive after lower-level parity looked correct. That allowed normal UI creation to bypass canonical duplicate validation and Action Core transaction/audit. The real screen now uses the canonical adapter.

### Duplicate guided-session start

`GuidedSessionFlow` called `recordClinicalSessionStarted()` from inside a React state-updater callback. Development/Strict Mode could invoke the updater more than once, creating duplicate `session_started` clinical activity from one click. The side effect now runs once in the event handler and the state updater is pure. E2E explicitly asserts exactly one start event before and after completion.

## UX and performance decisions

This block deliberately avoided a visual rebuild.

Validated/corrected behavior includes:

- consistent Edit / Cancel / Save semantics;
- Undo where domain-safe and genuinely reversible;
- no forced Undo for clinical versioning/preferences where it would produce misleading behavior;
- mobile overlay/dock/focus/Escape/scroll behavior;
- reduced derivation hotspots in patient catalogue, Home and Activity without invented latency claims;
- no automatic conversation mixing between general/contextual assistants.

## Files and scope QC

PR #20 changes are contained inside Atal and cover domain actions, adapters, assistant policy/execution, screens directly needed for parity, query optimizations, tests, E2E and Behavior System documentation/workflows.

No FOCO/mobile-lab files are part of PR #20.

No backend/auth/payment work is included.

`atal:store:v2` remains the persistence contract.

## Integration risk / required merge order

PR #20 is intentionally stacked on PR #19 (`feature/atal-ai-linear-agent`). PR #19 remains open, draft and unmerged, with its own remaining product-owner visual/conversational validation gate.

Therefore PR #20 should **not** be merged directly into a target that does not contain the PR #19 base. Safe integration options are:

1. review/approve PR #19 first, then merge/rebase PR #20 onto the resulting base and rerun all CI; or
2. intentionally combine the stack in a controlled integration branch and rerun the same three belts before any merge to `main`.

Do not auto-merge either PR from this handoff.

## Human review checklist

Before integration:

- review the final conversational/visual experience inherited from PR #19 in the intended preview environment;
- confirm PR #20 remains behaviorally aligned with that experience rather than replacing it;
- preserve general/contextual transcript isolation;
- preserve the shared Action Core and canonical domain families;
- rerun `quality`, `behavior-system-quality` and full Playwright E2E after any rebase/merge-base movement;
- do not accept new direct store mutation paths for shared clinical actions without an explicit documented reason.

## Final technical status

Behavior System implementation: **complete**.

Behavior parity: **10/10 covered**.

Regression belts on closure SHA: **green**.

Known technical blocker inside the Behavior System: **none**.

Remaining gate: **human review and controlled integration of the PR #19 → PR #20 stack**.
