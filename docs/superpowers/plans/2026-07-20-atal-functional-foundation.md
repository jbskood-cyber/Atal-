# Atal Functional Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Atal's approved local application safe, testable, and internally coherent without changing its approved visual system or adding backend integrations.

**Architecture:** Keep `atal:store:v2` as the local source of truth and IndexedDB as the binary-media repository. Move critical rules into focused pure helpers, expose safe store operations, and connect the existing screens to those helpers. Add automated tests and CI before broad behavioral changes.

**Tech Stack:** React 19, TypeScript 5.9, Vite 6, React Router 7, Vitest, Testing Library, localStorage, IndexedDB.

## Global Constraints

- Base commit: `8dba87df94926aa39d7741961d540323ec931874`.
- Work only on `feature/atal-functional-foundation`.
- Do not modify or remove the approved visual stylesheet stack.
- Preserve official green `#7EB695` and the approved dock.
- Do not add backend, authentication, PDF, WhatsApp, landing, or payments in this block.
- Every behavioral change requires a regression test.

## Progress overview

- [x] Create isolated branch from approved `main`.
- [x] Write approved design specification.
- [x] Write implementation plan and progress checklist.
- [ ] Task 1 — Install the test harness and CI quality gate.
- [ ] Task 2 — Establish one canonical application tree.
- [ ] Task 3 — Separate empty production workspace from explicit demo data.
- [ ] Task 4 — Repair clinical-record and plan association rules.
- [ ] Task 5 — Make exercise and multimedia duplication independent and atomic.
- [ ] Task 6 — Add validation and unsaved-change protection.
- [ ] Task 7 — Harden Atal IA plan mutations, contradictions, and attachment limits.
- [ ] Task 8 — Run the complete verification gate and prepare the PR.

---

### Task 1: Test harness and CI quality gate

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/smoke/appRoutes.test.tsx`
- Create: `.github/workflows/quality.yml`

**Produces:**
- `npm test` for watch mode.
- `npm run test:run` for deterministic CI execution.
- A jsdom environment with localStorage, IndexedDB test doubles, and Testing Library cleanup.

- [ ] Add `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `fake-indexeddb` to `devDependencies`.
- [ ] Add scripts: `test`, `test:run`, and `quality` (`typecheck && test:run && build`).
- [ ] Create `vitest.config.ts` using the existing `@` and `next/*` aliases.
- [ ] Create test setup that imports `@testing-library/jest-dom/vitest`, installs `fake-indexeddb/auto`, clears storage, and runs Testing Library cleanup.
- [ ] Write a failing smoke test that renders the canonical application and confirms Home, Patients, Plans, and Atal IA routes resolve.
- [ ] Run `npm run test:run`; confirm the initial smoke test fails before wiring.
- [ ] Make the minimum configuration change required for the smoke test to pass.
- [ ] Add GitHub Actions steps: checkout, Node 20, `npm ci`, `npm run typecheck`, `npm run test:run`, `npm run build`.
- [ ] Run `npm run quality` and commit as `test: add functional quality gate`.

### Task 2: Canonical application tree

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/AppCloseout.tsx`
- Modify or replace with compatibility export: `src/App.tsx`
- Review/remove obsolete screen implementations only when no canonical import references them:
  - `src/screens/PlanBuilderScreen.tsx`
  - `src/screens/PlanDetailScreen.tsx`
  - `src/screens/NewExerciseScreen.tsx`
- Test: `src/test/smoke/appRoutes.test.tsx`
- Test: `src/test/architecture/canonicalApp.test.ts`

**Produces:**
- One route map and one canonical screen implementation per route.
- Compatibility imports cannot re-enable obsolete screens.

- [ ] Write a failing architecture test that scans `src/main.tsx` and `src/App.tsx` and asserts there is one application route owner.
- [ ] Make `AppCloseout` the named canonical `App` export or convert `App.tsx` into a simple re-export of the canonical application.
- [ ] Remove obsolete route wiring and dead imports.
- [ ] Delete old screen files only after repository search confirms no runtime/test imports.
- [ ] Run route smoke and architecture tests.
- [ ] Run typecheck and build.
- [ ] Commit as `refactor: establish canonical Atal application tree`.

### Task 3: Explicit demo workspace

**Files:**
- Modify: `src/data/atalStore.ts`
- Create: `src/data/demoWorkspace.ts`
- Modify: `src/screens/SystemStatesScreen.tsx` or add an explicit developer-only demo action in the existing system-state surface.
- Test: `src/test/data/workspaceInitialization.test.ts`

**Interfaces:**
- Produces: `createEmptyAtalState(): AtalState`.
- Produces: `createDemoAtalState(): AtalState`.
- Produces: `initializeDemoWorkspace(): AtalState`.

- [ ] Write failing tests proving an empty browser starts with zero patients, plans, exercises, sessions, and events.
- [ ] Write a failing test proving existing valid `atal:store:v2` data loads unchanged.
- [ ] Extract current seed generation into `createDemoAtalState()`.
- [ ] Change normal initialization to `createEmptyAtalState()`.
- [ ] Add an explicit demo initializer with a destructive confirmation and clear developer/demo labeling.
- [ ] Verify the visual Home empty states remain usable with zero data.
- [ ] Run data tests, route smoke tests, typecheck, and build.
- [ ] Commit as `fix: separate demo workspace from real local data`.

### Task 4: Clinical record and plan association

**Files:**
- Create: `src/domain/planAssociation.ts`
- Modify: `src/data/atalStore.ts`
- Modify: `src/features/clinical-record/ClinicalRecordScreen.tsx`
- Modify: `src/data/localPlans.ts`
- Test: `src/test/domain/planAssociation.test.ts`
- Test: `src/test/data/planLifecycle.test.ts`

**Interfaces:**
- Produces: `resolveAssociatedPlanId(state: AtalState, patientId: string, preferredPlanId?: string): string`.
- Produces: `syncClinicalRecordPlanAssociation(draft: AtalState, patientId: string, preferredPlanId?: string): void`.

- [ ] Write failing tests for: draft creation, active-plan activation, duplicate-plan creation, pause, complete, archive, restore, and deletion.
- [ ] Implement association priority: active plan first; explicit preferred plan only when no active plan; otherwise most recently updated non-archived plan; otherwise empty.
- [ ] Remove unconditional `record.planId = newPlan.id` from generic plan creation.
- [ ] Call association sync after relevant plan lifecycle mutations.
- [ ] Make ClinicalRecordScreen resolve defensively if a historical `planId` no longer exists.
- [ ] Run lifecycle tests and verify no existing session/plan protection regresses.
- [ ] Commit as `fix: preserve clinical plan associations`.

### Task 5: Independent and atomic exercise duplication

**Files:**
- Modify: `src/data/exerciseMediaRepository.ts`
- Modify: `src/data/localExercises.ts`
- Modify: `src/data/atalStore.ts`
- Modify: `src/features/plan-closeout/SafePlanExerciseList.tsx`
- Modify: `src/screens/PlanDetailCloseoutScreen.tsx`
- Create: `src/features/plan-closeout/planEditSession.ts`
- Test: `src/test/data/exerciseDuplication.test.ts`
- Test: `src/test/features/planEditSession.test.ts`

**Interfaces:**
- Produces: `cloneExerciseMedia(sourceMediaId: string, targetExerciseId: string): Promise<ExerciseMediaRecord>`.
- Produces: `duplicateExerciseWithMedia(id: string): Promise<ExerciseEntity>`.
- Produces a plan edit session that stages created exercise IDs and removes them on discard.

- [ ] Write failing tests that source and duplicate receive distinct exercise IDs and distinct media IDs.
- [ ] Write a failing rollback test for media-clone failure.
- [ ] Implement blob cloning into a new IndexedDB record.
- [ ] Implement `duplicateExerciseWithMedia` with rollback of the duplicate entity if media cloning fails.
- [ ] Replace synchronous duplication in exercise detail and plan contextual menus.
- [ ] Stage plan-editor-created duplicates until save; remove staged duplicates when the user discards or leaves without saving.
- [ ] Confirm saving the plan promotes staged duplicates and preserves their media.
- [ ] Run duplication and plan-edit tests.
- [ ] Commit as `fix: make exercise duplication independent and atomic`.

### Task 6: Validation and unsaved-change protection

**Files:**
- Create: `src/domain/validation.ts`
- Create: `src/hooks/useUnsavedChangesGuard.ts`
- Modify: `src/screens/NewPatientScreen.tsx`
- Modify: `src/screens/PatientProfileScreen.tsx`
- Modify: `src/screens/PlanBuilderCloseoutScreen.tsx`
- Modify: `src/screens/PlanDetailCloseoutScreen.tsx`
- Modify: `src/screens/NewExerciseCloseoutScreen.tsx`
- Modify: `src/screens/ExerciseDetailScreen.tsx`
- Test: `src/test/domain/validation.test.ts`
- Test: `src/test/hooks/useUnsavedChangesGuard.test.tsx`

**Interfaces:**
- Produces typed validation results `{ valid: boolean; errors: Record<string,string> }`.
- Produces a guard with `requestNavigation`, `confirmDiscard`, and `cancelDiscard`.

- [ ] Write failing validation tests for blank names/titles, invalid ages, invalid pain ranges, empty instructions, inconsistent dose, and active plan without exercises.
- [ ] Implement pure patient, plan, and exercise validators.
- [ ] Connect validators to creation and editing screens using existing Atal error/message styles.
- [ ] Write failing tests that dirty screens intercept back navigation, status changes, duplicate, delete, archive, and route changes.
- [ ] Implement the unsaved-change hook with browser `beforeunload` plus an in-app confirmation dialog.
- [ ] Ensure Save, Discard, and Cancel have deterministic behavior.
- [ ] Run validation/guard tests, typecheck, and build.
- [ ] Commit as `fix: protect clinical edits and validate local data`.

### Task 7: Atal IA integrity and request limits

**Files:**
- Modify: `src/features/atal-ai/types.ts`
- Create: `src/features/atal-ai/domain/exerciseMutation.ts`
- Create: `src/features/atal-ai/domain/attachmentLimits.ts`
- Modify: `src/features/atal-ai/api/schemas.ts`
- Modify: `src/features/atal-ai/api/prompts.ts`
- Modify: `src/features/atal-ai/AtalAIConversationScreen.tsx`
- Modify: `src/features/atal-ai/components/ConversationalDraftCard.tsx`
- Modify: `src/features/atal-ai/data/applyDraft.ts`
- Modify: `server/atalAIPlugin.ts`
- Test: `src/test/atal-ai/exerciseMutation.test.ts`
- Test: `src/test/atal-ai/contradictionGate.test.tsx`
- Test: `src/test/atal-ai/attachmentLimits.test.ts`

**Interfaces:**
- Produces explicit mutation mode: `preserve | append | replace-one | remove-one | replace-all`.
- Produces `validateAttachmentSelection(files, existing): AttachmentLimitResult`.

- [ ] Write failing tests proving a partial AI exercise response cannot erase existing plan exercises.
- [ ] Add explicit exercise mutation mode and target IDs to the AI schema and prompt.
- [ ] Implement deterministic mutation application with relationship validation.
- [ ] Write a failing UI test proving unresolved contradictions disable normal Apply.
- [ ] Add a reinforced override path that requires explicit confirmation and records the override in the activity event.
- [ ] Define a shared encoded-request budget below 32 MB and reject selections before `FileReader.readAsDataURL` when the cumulative estimate exceeds it.
- [ ] Use the same constants in the UI and Vite endpoint.
- [ ] Test mixed PDF/image/audio selections and boundary sizes.
- [ ] Run all AI unit tests, typecheck, and build.
- [ ] Commit as `fix: harden Atal IA data application`.

### Task 8: Full verification and pull request

**Files:**
- Update: `docs/superpowers/plans/2026-07-20-atal-functional-foundation.md`
- Create: `docs/functional-qa/2026-07-20-foundation-checklist.md`

- [ ] Mark every completed task and include the commit SHA beside it.
- [ ] Run `npm ci` from a clean environment.
- [ ] Run `npm run typecheck` and record the output.
- [ ] Run `npm run test:run` and record test totals.
- [ ] Run `npm run build` and record the generated build result.
- [ ] Manually verify mobile routes: Home, Patients, patient detail, clinical record, Plans, plan detail, Exercises, exercise detail, portal preview, guided session, Activity, report detail, Settings, Exports, Atal IA.
- [ ] Confirm the six final visual stylesheet imports are unchanged.
- [ ] Confirm `main` remains untouched.
- [ ] Open a pull request titled `fix: establish Atal functional foundation` with risk notes, test evidence, and screenshots only where behavior changed.
- [ ] Do not merge until CI is green and the approved visual appearance is confirmed in IA Studio or ChatGPT Work.
