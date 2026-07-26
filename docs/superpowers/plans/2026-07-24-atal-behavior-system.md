# Atal Behavior System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ten critical Atal behaviors use one canonical domain meaning across manual UI and Atal IA, with shared transactional invariants, audit and Undo guarantees.

**Architecture:** Migrate incrementally. First extract canonical pure domain actions from duplicated UI/AI mutations. Then generalize the current AI transaction engine into a source-aware action transaction executor and route both manual repositories and AI tools through it. Keep AI entity resolution/risk/confirmation outside the domain actions and preserve existing UI interaction patterns.

**Tech Stack:** TypeScript, React, Vite, Node `node:test`, existing `atal:store:v2`, existing Atal IA core.

## Global Constraints

- Do not modify `main` directly.
- Work only on `feature/atal-behavior-system`, based on audited PR #19 HEAD `1b1a49eb23f6bd135f27906b0321a2d8b481ba8d`.
- Do not merge or mark PR #19 ready.
- Preserve `atal:store:v2` persistence and migrations.
- Preserve separation between general and contextual Atal IA conversations.
- No visual redesign in this block.
- No new backend/auth/payment dependencies.
- TDD: failing test first, then minimal production change.
- Every migrated action must prove UI/AI semantic parity.

---

### Task 1: Canonical patient lifecycle behavior

**Files:**
- Create: `src/domain/actions/patientLifecycle.ts`
- Modify: `src/data/localPatients.ts`
- Modify: `src/features/atal-ai/core/tools/universalPatientTools.ts`
- Test: `tests/atal-behavior-system.test.mjs`

**Interfaces:**
- Produces: `applyPatientLifecycle(state, { patientId, archived, now, createEventId })`
- Returns: `{ patientId, pausedPlanIds }`

- [ ] **Step 1: Write the failing parity test**

Test one patient with one active and one draft plan. The canonical archive behavior must archive the patient, pause only the active plan, update timestamps, and emit one `plan_paused` event. Restore must only restore the patient and must not reactivate plans.

```js
const result = actions.applyPatientLifecycle(state, {
  patientId: 'patient-1',
  archived: true,
  now: '2026-07-24T12:00:00.000Z',
  createEventId: () => 'event-1',
});
assert.equal(state.patients[0].status, 'archived');
assert.equal(state.plans.find((p) => p.id === 'active-plan').status, 'paused');
assert.equal(state.plans.find((p) => p.id === 'draft-plan').status, 'draft');
assert.deepEqual(result.pausedPlanIds, ['active-plan']);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test`

Expected: FAIL because `src/domain/actions/patientLifecycle` does not exist yet.

- [ ] **Step 3: Implement the pure behavior**

```ts
export function applyPatientLifecycle(state: AtalState, input: PatientLifecycleActionInput) {
  const patient = state.patients.find((item) => item.id === input.patientId);
  if (!patient) throw new Error('Paciente no encontrado.');
  patient.status = input.archived ? 'archived' : 'active';
  patient.updatedAt = input.now;
  const pausedPlanIds: string[] = [];
  if (input.archived) {
    for (const plan of state.plans.filter((item) => item.patientId === patient.id && item.status === 'active')) {
      plan.status = 'paused';
      plan.updatedAt = input.now;
      pausedPlanIds.push(plan.id);
      state.events.unshift({
        id: input.createEventId(),
        kind: 'plan_paused',
        patientId: patient.id,
        planId: plan.id,
        title: 'Plan pausado',
        detail: `${plan.title} · paciente archivado`,
        createdAt: input.now,
      });
    }
  }
  return { patientId: patient.id, pausedPlanIds };
}
```

- [ ] **Step 4: Make both adapters delegate**

`archiveLocalPatient`/`restoreLocalPatient` call the canonical action inside one `mutateAtalStore` mutation. `patient.lifecycle.execute` calls the same function against `environment.state`.

- [ ] **Step 5: Run quality and verify GREEN**

Run: `npm run quality`

Expected: all typecheck/tests/build pass.

- [ ] **Step 6: Commit**

`git commit -m "refactor: unify patient lifecycle behavior"`

---

### Task 2: Source-aware action transaction contracts

**Files:**
- Create: `src/domain/actions/contracts.ts`
- Create: `src/domain/actions/actionTransaction.ts`
- Modify: `src/features/atal-ai/core/contracts.ts`
- Modify: `src/features/atal-ai/core/transactionEngine.ts`
- Test: `tests/atal-behavior-system.test.mjs`

**Interfaces:**
- Produces: `ActionOrigin = 'manual-ui' | 'atal-ai-general' | 'atal-ai-contextual' | 'system'`
- Produces: `executeActionTransaction(request, port)`
- AI transaction engine becomes an adapter over the shared transaction executor.

- [ ] **Step 1: Write failing tests for origin-aware audit and Undo**

```js
const outcome = executeActionTransaction({
  action: 'patient.lifecycle',
  origin: { type: 'manual-ui' },
  now,
  supportsUndo: true,
  mutate(state) { /* canonical behavior */ },
}, port);
assert.equal(outcome.audit.origin, 'manual-ui');
assert.ok(outcome.undo?.id);
```

Also assert that AI-origin metadata preserves conversation/tool fields without making them mandatory for manual actions.

- [ ] **Step 2: Verify RED**

Run: `npm test`

- [ ] **Step 3: Extract generic snapshot/invariant/Undo mechanics**

Move the non-AI-specific mechanics from `transactionEngine.ts` into `actionTransaction.ts`. The shared executor must not call risk policy.

- [ ] **Step 4: Make AI transaction adapter preserve existing behavior**

`executeMutationTransaction` still checks AI confirmation/risk policy, then calls `executeActionTransaction` with an AI origin and tool metadata.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm run quality`

Commit: `refactor: make action transactions source aware`

---

### Task 3: Patient and clinical-record canonical actions

**Files:**
- Create: `src/domain/actions/patientActions.ts`
- Create: `src/domain/actions/clinicalRecordActions.ts`
- Modify: `src/data/localPatients.ts`
- Modify: `src/features/clinical-record/clinicalRecordRepository.ts`
- Modify: `src/features/atal-ai/core/tools/universalPatientTools.ts`
- Test: `tests/atal-behavior-system.test.mjs`

**Interfaces:**
- `applyCreatePatient`
- `applyUpdatePatient`
- `applyUpsertClinicalRecord`

- [ ] **Step 1: Write parity tests** proving immutable IDs/timestamps, duplicate-name policy, record version increments, snapshot creation and plan ownership validation.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Extract minimal canonical actions from existing validated semantics.**
- [ ] **Step 4: Route manual repositories and AI tool execute functions through those actions.**
- [ ] **Step 5: Run `npm run quality`; commit `refactor: unify patient and record actions`.**

---

### Task 4: Plan behavior and active-plan state machine

**Files:**
- Create: `src/domain/actions/planActions.ts`
- Modify: `src/data/localPlans.ts`
- Modify: `src/features/atal-ai/core/tools/universalPlanExerciseTools.ts`
- Modify: existing plan lifecycle tool module if lifecycle is defined elsewhere
- Test: `tests/atal-behavior-system.test.mjs`

**Interfaces:**
- `applyCreatePlan`
- `applyUpdatePlan`
- `applyPlanLifecycle`
- `applyPlanMembership`
- `applyDuplicatePlan`

- [ ] **Step 1: Write tests** for one-active-plan invariant, activation resolution, record-plan association, active-plan nonempty membership and reorder exact-membership rule.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement canonical actions.**
- [ ] **Step 4: Replace direct plan semantics in both adapters.**
- [ ] **Step 5: Run quality and commit `refactor: unify treatment plan behavior`.**

---

### Task 5: Exercise behavior with media boundary preserved

**Files:**
- Create: `src/domain/actions/exerciseActions.ts`
- Modify: `src/data/localExercises.ts`
- Modify: `src/features/atal-ai/core/tools/universalPlanExerciseTools.ts`
- Test: `tests/atal-behavior-system.test.mjs`

**Interfaces:**
- `applyCreateExercise`
- `applyUpdateExercise`
- `applyExerciseLifecycle`
- `applyDuplicateExerciseState`

- [ ] **Step 1: Write tests** for positive integer sets/repetitions, pain range 0–10, trimmed instructions, archive semantics and duplicate state identity.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement pure state behavior; do not move IndexedDB/media I/O into domain actions.**
- [ ] **Step 4: Keep media clone/delete orchestration in `localExercises.ts` and roll state back on media failure as today.**
- [ ] **Step 5: Run quality and commit `refactor: unify exercise behavior`.**

---

### Task 6: Guided-session completion behavior

**Files:**
- Create: `src/domain/actions/sessionActions.ts`
- Modify: `src/features/guided-session/sessionRepository.ts`
- Modify: `src/features/atal-ai/core/tools/universalSessionSettingsTools.ts`
- Test: `tests/atal-behavior-system.test.mjs`

- [ ] **Step 1: Write parity tests** for session ownership, completion timestamps, persisted metrics and resulting activity/progress-visible state.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Extract canonical session completion.**
- [ ] **Step 4: Route UI and AI adapters through it.**
- [ ] **Step 5: Run quality and commit `refactor: unify session completion behavior`.**

---

### Task 7: Manual UI transaction adapter and Undo surface

**Files:**
- Create: `src/domain/actions/manualActionExecutor.ts`
- Modify: migrated local repositories to use it
- Modify: smallest existing toast/action feedback component capable of presenting Undo
- Test: `tests/atal-behavior-system.test.mjs`
- E2E: add focused behavior spec under `e2e/`

- [ ] **Step 1: Write failing tests** proving manual actions receive transaction ID, source-aware audit and Undo receipt.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement manual executor over `executeActionTransaction`.**
- [ ] **Step 4: Expose Undo only for successful reversible actions; do not redesign screens.**
- [ ] **Step 5: Run quality/E2E and commit `feat: add transactional manual action execution`.**

---

### Task 8: Ten-action parity matrix and regression closure

**Files:**
- Test: `tests/atal-behavior-system.test.mjs`
- E2E: `e2e/behavior-system.spec.ts`
- Update: `docs/superpowers/specs/2026-07-24-atal-behavior-system-design.md`

- [ ] **Step 1: Add a parity test matrix** covering the ten canonical behavior contracts.
- [ ] **Step 2: Add E2E checks** for representative manual and AI paths, contextual scope isolation, general/contextual history isolation and Undo.
- [ ] **Step 3: Run `npm run typecheck`, `npm test`, `npm run build` and the relevant Playwright suite.**
- [ ] **Step 4: Verify the application starts and critical flows are not blocked by runtime errors.**
- [ ] **Step 5: Document any intentionally remaining direct write path and its safety rationale.**
- [ ] **Step 6: Commit `test: close Atal behavior parity matrix`.**

## Definition of done

Do not declare the Behavior System complete until the design acceptance criteria, parity tests, quality workflow and E2E workflow are all green on the Behavior System branch/PR. No merge is part of this plan unless explicitly authorized after validation.
