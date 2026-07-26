# ATAL × Linear — Behavior Parity Matrix

This matrix closes the first behavior-system contract: core clinical actions must have one canonical domain meaning regardless of whether the action starts in direct UI or Atal IA. It intentionally does **not** invent AI commands for patient-only flows merely to make the table symmetrical.

| # | Behavior | Direct UI adapter | Atal IA adapter | Canonical domain action family | Evidence / note |
|---|---|---|---|---|---|
| 1 | Create patient | `src/data/localPatients.ts` | `universalPatientTools.ts` / `patient.create` | `applyCreatePatient` | Duplicate-name policy and patient creation event are shared. |
| 2 | Update patient | `src/data/localPatients.ts` | `universalPatientTools.ts` / `patient.update` | `applyUpdatePatient` | Identity, timestamps, contact merge and events are shared. |
| 3 | Archive / restore patient | `src/data/localPatients.ts` | `universalPatientTools.ts` / `patient.lifecycle` | `applyPatientLifecycle` | Archiving pauses active plans consistently and emits the same lifecycle events. |
| 4 | Create / update clinical record | `clinicalRecordRepository.ts` | `universalPatientTools.ts` / `clinical_record.upsert` | `applyUpsertClinicalRecord` | Version snapshot, plan ownership and clinical date semantics are shared. |
| 5 | Create plan | `src/data/localPlans.ts` | `canonicalPlanTools.ts` / `plan.create`; `patient.create` composite | `applyCreatePlan` | Composite patient creation is explicitly prohibited from directly pushing into `state.plans`. |
| 6 | Update plan fields | `src/data/localPlans.ts` | `canonicalPlanTools.ts` / `plan.update` | `applyUpdatePlan` | Exercise existence, active-plan invariants, association sync and events live in domain. |
| 7 | Plan lifecycle | `src/data/localPlans.ts` | `canonicalPlanLifecycleTools.ts` | `applyPlanLifecycle` | Activate, pause, complete, archive, restore and active-plan replacement use one transition model. |
| 8 | Plan exercise membership | UI saves the full `exerciseIds` set through `applyUpdatePlan` | `canonicalPlanTools.ts` uses `applyPlanMembership` for add/remove/reorder | `planActions.ts` | This is an intentional surface asymmetry. Both paths share the same exercise/active-plan invariants and clinical-record association/versioning layer. |
| 9 | Exercise create / update / lifecycle | `src/data/localExercises.ts` | `canonicalUniversalExerciseTools.ts` | `exerciseActions.ts` (`applyCreateExercise`, `applyUpdateExercise`, `applyExerciseLifecycle`) | Media/IndexedDB remains an adapter-side effect; domain semantics are shared. |
| 10 | Guided session start / complete + clinician review | `sessionRepository.ts` starts/completes guided sessions | `universalSessionSettingsTools.ts` handles clinician review | `sessionActions.ts` | Starting/completing is intentionally patient-side; no fake IA command is introduced. Clinician review shares the same session domain action family and activity semantics. |

## Guardrails enforced by tests

`tests/atal-behavior-parity-matrix.test.mjs` fails if the principal UI or IA adapters stop importing the canonical action family for these ten behaviors. It also fails if the `patient.create` composite reintroduces a direct `environment.state.plans.push(...)` path.

This architectural test complements, rather than replaces, behavior tests for each action, the legacy suite, `quality`, and Playwright E2E.

## Intentional non-parity

Some writes remain intentionally local because an AI invocation would not improve the product contract:

- notification read state;
- product feedback submission;
- patient-side guided-session start/completion.

These are not parallel clinical mutation paths that require an AI counterpart. The behavior-system rule is **same meaning when multiple invocation surfaces exist**, not artificial one-to-one UI/AI symmetry.

## Next phase

With the ten-action matrix closed, the next target is contextual assistant isolation and scope correctness while preserving the general assistant and contextual assistants as separate conversational instances over the same safe action core.
