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

## Verified browser evidence at audit start

| # | Behavior | Direct UI browser evidence | Atal IA browser evidence | Phase 6.1 state |
|---|---|---|---|---|
| 1 | Create patient | Not yet verified in this audit | `block-4-1-critical.spec.mjs`: normalized duplicate `patient.create` is rejected with zero mutation. Successful create path still missing. | Gap |
| 2 | Update patient | `behavior-ux-consistency.spec.mjs`: patient profile save persists canonical update; cancel is zero-mutation. | Not yet verified. | Partial |
| 3 | Archive / restore patient | Not yet verified. | Not yet verified. | Gap |
| 4 | Create / update clinical record | `block-4-1-critical.spec.mjs` + `behavior-clinical-record-edit.spec.mjs`: browser edit validates, versions and persists; Phase 5 also proves cancel is zero-mutation. | Not yet verified. | Partial |
| 5 | Create plan | Not yet verified. | Not yet verified. | Gap |
| 6 | Update plan fields | `behavior-plan-edit-undo.spec.mjs`: browser edit saves through canonical transaction and Undo restores prior state. | Not yet verified. | Partial |
| 7 | Plan lifecycle | Not yet verified. | `block-4-1-critical.spec.mjs`: `plan.activate` confirmation, cancel/no-mutation and confirmed activation are exercised. | Partial |
| 8 | Plan exercise membership | Not yet verified. | Not yet verified. | Gap |
| 9 | Exercise create / update / lifecycle | Not yet verified. | Not yet verified. | Gap |
| 10 | Guided session start / complete + clinician review | Existing repository E2E must be source-audited before credit is assigned. | Clinician-review path must be source-audited; no AI start/complete path should be invented. | Audit pending |

## Cross-cutting evidence already green

These tests do not replace the ten rows, but protect the system around them:

- `block-4-2-contextual-propagation.spec.mjs`: a contextual AI mutation is visible in normal patient UI, survives reload, and does not contaminate global conversation history.
- `block-4-1-critical.spec.mjs`: read-only AI leaves the clinical store untouched; reversible AI note is audited and Undo restores exactly; stale sensitive actions are blocked.
- `behavior-phase-5-interaction.spec.mjs`: edit cancellation, mobile overlays, focus, Escape behavior, dock suppression and scroll continuity.
- full `quality`, Behavior System and Playwright E2E belts are required on every closure SHA.

## Next implementation slice

Close gaps in bounded groups rather than one brittle mega-test:

1. patient: successful create + AI update + UI/AI lifecycle;
2. plan: create + AI field update + UI lifecycle + membership;
3. exercise: representative create/update/lifecycle on UI and IA;
4. session: source-audit existing guided-session E2E, then add only the missing clinician-review browser route.

Each new test should verify persisted `atal:store:v2` state and, for AI writes, the corresponding audit/transaction semantics where relevant.

Do not change product code merely to make a test easier. If a new E2E exposes a real behavior defect, switch back to RED → minimal product fix → full regression.
