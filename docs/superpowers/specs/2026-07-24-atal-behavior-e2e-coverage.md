# ATAL × Linear — E2E Coverage Audit

Status: **in progress — Phase 6.1**

This document is the runtime-coverage companion to `2026-07-24-atal-behavior-parity-matrix.md`.

The architecture matrix proves that UI and Atal IA adapters delegate to the same canonical domain families. This audit has a stricter purpose: identify which of the ten behaviors are already exercised through real browser surfaces and which representative UI/AI paths are still missing before Phase 6.1 can be closed.

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
| 9 | Exercise create / update / lifecycle | Not yet verified. | Not yet verified. | Gap |
| 10 | Guided session start / complete + clinician review | Existing repository E2E must be source-audited before credit is assigned. | Clinician-review path must be source-audited; no AI start/complete path should be invented. | Audit pending |

## Defect exposed by Phase 6.1

The first patient browser RED uncovered a real escaped mutation path: `NewPatientScreen` still called legacy `createPatientWithRecord` directly from `atalStore`, so manual patient creation bypassed `applyCreatePatient`, shared duplicate normalization, Action Core audit and transaction semantics even though the lower-level parity matrix looked green.

The fix routes the actual screen through `createLocalPatientWithRecord`, which composes `applyCreatePatient` + `applyUpsertClinicalRecord` inside `executeActionTransaction`. The parity test now also inspects `NewPatientScreen` so this bypass cannot silently return.

Closure evidence for the patient slice: SHA `8e77379da5f52a6155f4b3ad696940f28a524977` · `behavior-system-quality` #171 ✅ · `quality` #600 ✅ · `e2e` #576 ✅.

Closure evidence for the clinical-record slice: SHA `ba57a9c9aa34222915a13694eab8be7dace1cf6b` · `behavior-system-quality` #174 ✅ · `quality` #603 ✅ · `e2e` #579 ✅.

Closure evidence for the plan slice: SHA `0188154c1bdd6983c53fa9ad54ee1d88359116ad` · `behavior-system-quality` #183 ✅ · `quality` #612 ✅ · `e2e` #588 ✅. The browser belt now covers plan creation, field updates, lifecycle and exercise membership across the real UI and Atal IA invocation surfaces. The plan-create E2E also verifies that the test intentionally enters agentic action mode rather than the separate structured-draft flow; no product behavior was changed merely to make the test pass.

## Cross-cutting evidence already green

These tests do not replace the ten rows, but protect the system around them:

- `block-4-2-contextual-propagation.spec.mjs`: a contextual AI mutation is visible in normal patient UI, survives reload, and does not contaminate global conversation history.
- `block-4-1-critical.spec.mjs`: read-only AI leaves the clinical store untouched; reversible AI note is audited and Undo restores exactly; stale sensitive actions are blocked.
- `behavior-phase-5-interaction.spec.mjs`: edit cancellation, mobile overlays, focus, Escape behavior, dock suppression and scroll continuity.
- full `quality`, Behavior System and Playwright E2E belts are required on every closure SHA.

## Next implementation slice

Close the remaining gaps in bounded groups rather than one brittle mega-test:

1. exercise: representative create/update/lifecycle on UI and IA;
2. session: source-audit existing guided-session E2E, then add only the missing clinician-review browser route.

Each new test should verify persisted `atal:store:v2` state and, for AI writes, the corresponding audit/transaction semantics where relevant.

Do not change product code merely to make a test easier. If a new E2E exposes a real behavior defect, switch back to RED → minimal product fix → full regression.
