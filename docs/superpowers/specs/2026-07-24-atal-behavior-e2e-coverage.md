# ATAL × Linear — E2E Coverage Audit

Status: **Phase 6.1 complete — 10/10 behaviors covered**

This document is the runtime-coverage companion to `2026-07-24-atal-behavior-parity-matrix.md`.

The architecture matrix proves that UI and Atal IA adapters delegate to the same canonical domain families. This audit has a stricter purpose: prove the ten fundamental behaviors through real browser surfaces, persisted `atal:store:v2` state, and audited AI transactions where an AI invocation surface actually exists.

## Rules

1. Do not count a unit/domain test as E2E.
2. Do not count a static import/architecture assertion as E2E.
3. A browser test counts only when it invokes the actual user surface and verifies persisted state or an observable no-mutation result.
4. Intentional non-parity remains intentional: do not invent an AI command for patient-side guided-session start/completion.
5. One representative browser path per invocation surface is sufficient when lower-level behavior tests already exhaustively cover the domain variants.

## Verified browser evidence

| # | Behavior | Direct UI browser evidence | Atal IA browser evidence | Phase 6.1 state |
|---|---|---|---|---|
| 1 | Create patient | `behavior-phase-6-patient.spec.mjs`: successful browser create persists patient + initial clinical record in one canonical transaction; normalized duplicate is rejected with zero mutation. | `behavior-phase-6-patient.spec.mjs`: successful `patient.create` persists patient + initial record and audited transaction. `block-4-1-critical.spec.mjs` additionally proves normalized duplicate rejection with zero mutation. | **Covered** |
| 2 | Update patient | `behavior-ux-consistency.spec.mjs`: patient profile save persists canonical update; cancel is zero-mutation. | `behavior-phase-6-patient.spec.mjs`: `patient.update` persists the requested change and produces a reversible-write audit. | **Covered** |
| 3 | Archive / restore patient | `behavior-phase-6-patient.spec.mjs`: archive pauses the active plan, emits lifecycle activity, and restore reactivates the patient without silently reactivating the plan. | `behavior-phase-6-patient.spec.mjs`: sensitive `patient.lifecycle` performs zero mutation before confirmation, then archives the patient and pauses the active plan after confirmation. | **Covered** |
| 4 | Create / update clinical record | `block-4-1-critical.spec.mjs` + `behavior-clinical-record-edit.spec.mjs`: browser edit validates, versions and persists; Phase 5 also proves cancel is zero-mutation. | `behavior-phase-6-patient.spec.mjs`: `clinical_record.upsert` updates the selected record through the assistant, increments the version, preserves the previous snapshot and emits the reversible-write transaction audit. | **Covered** |
| 5 | Create plan | `behavior-phase-6-plan-create.spec.mjs`: the real plan builder persists a draft plan and selected exercise membership. | `behavior-phase-6-plan-create.spec.mjs`: the general assistant invokes `plan.create_simple`, persists the new plan and emits a reversible-write transaction audit. | **Covered** |
| 6 | Update plan fields | `behavior-plan-edit-undo.spec.mjs`: browser edit saves through canonical transaction and Undo restores prior state. | `behavior-phase-6-plan-runtime.spec.mjs`: `plan.update_fields` changes frequency through the general assistant and emits a reversible-write audit tied to the transaction. | **Covered** |
| 7 | Plan lifecycle | `behavior-phase-6-plan-runtime.spec.mjs`: real plan-detail actions pause an active plan and emit lifecycle activity. | `block-4-1-critical.spec.mjs`: `plan.activate` confirmation, cancel/no-mutation and confirmed activation are exercised. | **Covered** |
| 8 | Plan exercise membership | `behavior-phase-6-plan-runtime.spec.mjs`: adding an exercise remains staged until explicit Save, then persists the canonical membership set. | `behavior-phase-6-plan-runtime.spec.mjs`: `plan.membership` adds the exercise and records the audited reversible write. | **Covered** |
| 9 | Exercise create / update / lifecycle | `behavior-phase-6-exercise.spec.mjs`: the real local builder creates an active local exercise; the real detail screen persists a field edit and archives the same exercise. | `behavior-phase-6-exercise.spec.mjs`: `exercise.create_simple`, `exercise.update_fields` and `exercise.lifecycle` persist the canonical state and emit successful audited transactions. | **Covered** |
| 10 | Guided session start / complete + clinician review | `behavior-phase-6-session-review.spec.mjs`: the patient browser starts a real guided session, creates exactly one `session_started`, completes it as partial with a historical `planSnapshot`, activity and notification; the clinician UI then persists a review and emits `report_reviewed`. | `behavior-phase-6-session-review.spec.mjs`: `report.review` updates the same session through Atal IA and proves the successful reversible-write audit/transaction. Patient-side start/completion intentionally has no AI command. | **Covered** |

## Defects exposed by Phase 6.1

### Escaped patient creation path

The first patient browser RED uncovered a real escaped mutation path: `NewPatientScreen` still called legacy `createPatientWithRecord` directly from `atalStore`, so manual patient creation bypassed `applyCreatePatient`, shared duplicate normalization, Action Core audit and transaction semantics even though the lower-level parity matrix looked green.

The fix routes the actual screen through `createLocalPatientWithRecord`, which composes `applyCreatePatient` + `applyUpsertClinicalRecord` inside `executeActionTransaction`. The parity test now also inspects `NewPatientScreen` so this bypass cannot silently return.

### Duplicate guided-session start event

The final guided-session browser RED exposed a second real behavior defect: `GuidedSessionFlow` called `recordClinicalSessionStarted()` from inside a React state-updater callback. In development/Strict Mode that updater can be invoked more than once to validate purity, so one user click produced two `session_started` events with slightly different timestamps. The completion record matched only one of them, leaving duplicate clinical activity.

The fix moves the start side effect into the user event handler and leaves the `setDraft` updater pure. The E2E now explicitly requires exactly one matching `session_started` both immediately after starting and after session completion, preventing recurrence.

## Closure evidence

- Patient slice: SHA `8e77379da5f52a6155f4b3ad696940f28a524977` · `behavior-system-quality` #171 ✅ · `quality` #600 ✅ · `e2e` #576 ✅.
- Clinical-record slice: SHA `ba57a9c9aa34222915a13694eab8be7dace1cf6b` · `behavior-system-quality` #174 ✅ · `quality` #603 ✅ · `e2e` #579 ✅.
- Plan slice: SHA `0188154c1bdd6983c53fa9ad54ee1d88359116ad` · `behavior-system-quality` #183 ✅ · `quality` #612 ✅ · `e2e` #588 ✅.
- Exercise slice: SHA `eb611640038e3454947123e5c5e8a322c9a256ad` · `behavior-system-quality` #184 ✅ · `quality` #613 ✅ · `e2e` #589 ✅.
- Guided-session/review slice and Phase 6.1 final closure: SHA `936c7e405b614f04ad482cb2a1394a607ce03d38` · `behavior-system-quality` #193 ✅ · `quality` #622 ✅ · `e2e` #598 ✅.

`playwright.config.mjs` runs the complete `./e2e` directory and `e2e.yml` invokes `npx playwright test`, so every dedicated Phase 6 parity spec is part of the green browser belt rather than an unexecuted fixture.

## Cross-cutting evidence green at closure

- `block-4-2-contextual-propagation.spec.mjs`: a contextual AI mutation is visible in normal patient UI, survives reload, and does not contaminate global conversation history.
- `block-4-1-critical.spec.mjs`: read-only AI leaves the clinical store untouched; reversible AI note is audited and Undo restores exactly; stale sensitive actions are blocked.
- `behavior-phase-5-interaction.spec.mjs`: edit cancellation, mobile overlays, focus, Escape behavior, dock suppression and scroll continuity.
- `behavior-phase-6-session-review.spec.mjs`: guided-session start side effects are single-shot; completion persists historical plan state; clinician review is equivalent across UI and Atal IA.
- full `quality`, Behavior System and Playwright E2E belts are green on the Phase 6 closure SHA.

## Phase 6 result

The ten fundamental behaviors now have real browser evidence for every invocation surface that actually exists. No artificial AI pathway was created for patient-side guided-session start/completion. The Action Core, UI adapters, Atal IA adapters, persistence, audit and Undo contracts can now move to final architecture documentation and QC rather than further behavioral expansion.
