# ATAL × Linear Behavior System — Closeout & Review Handoff

Status: **READY_FOR_REVIEW — do not merge automatically**

## Objective completed

The Behavior System now gives Atal one canonical clinical meaning per core action regardless of whether the action begins in the direct UI, general Atal IA, or a contextual Atal IA surface that is allowed to perform it.

The final architecture keeps the product object as the protagonist and makes AI another invocation surface over the same domain semantics rather than a parallel data system.

```text
Direct UI ───────────────┐
                         ▼
                    Action Core
                         ▲
General Atal IA ─────────┤
                         │
Contextual Atal IA ──────┘
```

Shared beneath those surfaces:

- canonical domain actions;
- `atal:store:v2` persistence;
- source-aware mutation transactions;
- invariants;
- audit/activity metadata;
- Undo receipts where supported.

Conversation/session state remains intentionally isolated between the general assistant and contextual assistants.

## Ten behavior contracts — browser verified

1. Create patient.
2. Update patient.
3. Archive / restore patient.
4. Create / update/version clinical record.
5. Create plan.
6. Update plan fields.
7. Plan lifecycle.
8. Plan exercise membership.
9. Exercise create / update / lifecycle.
10. Guided session start / completion plus clinician review.

For patient-side guided-session start/completion there is intentionally **no artificial AI command**. AI parity applies to clinician review through `report.review`.

Detailed runtime evidence lives in:

- `docs/superpowers/specs/2026-07-24-atal-behavior-parity-matrix.md`
- `docs/superpowers/specs/2026-07-24-atal-behavior-e2e-coverage.md`

## Final verified product closure SHA

`936c7e405b614f04ad482cb2a1394a607ce03d38`

Fresh closure belts on that product SHA:

- `behavior-system-quality` #193 — PASS
- `quality` #622 — PASS
- `e2e` #598 — PASS

The subsequent documentation-only SHA `ff7f5731e2e87addae4c7bdf499e220e96841d1e` also passed:

- `behavior-system-quality` #194 — PASS
- `quality` #623 — PASS
- `e2e` #599 — PASS

## Important defects found and fixed during browser closure

### 1. Escaped direct patient creation path

`NewPatientScreen` still bypassed the canonical patient/record actions. The screen now routes through the same canonical semantics used elsewhere, including normalized duplicate handling and transactional audit.

### 2. Natural exercise commands blocked by agent policy

Normal phrases such as “ajusta…” and “rutina” did not consistently authorize/select exercise tools. The classifier/tool-selection layer now recognizes those natural direct-action forms without weakening risk/confirmation rules.

### 3. Duplicate `session_started` activity

`GuidedSessionFlow` performed a store side effect inside a React state-updater callback. In development/Strict Mode that updater could execute more than once, producing duplicate start events separated by milliseconds. The side effect was moved into the user event handler and the state updater was left pure. Browser tests require a single matching start event.

## Scope guardrails preserved

The PR does **not** intentionally add or redesign:

- backend architecture;
- authentication;
- payments;
- production secrets;
- a new persistence system;
- a parallel AI copy of clinical data;
- a shared conversation instance between general and contextual assistants;
- a broad visual redesign.

`atal:store:v2` remains the persistent clinical source used by the current product architecture.

## PR topology

Behavior System PR:

- PR #20 — `refactor: unify Atal through shared behavior system`
- head: `feature/atal-behavior-system`
- base: `feature/atal-ai-linear-agent` / PR #19
- state at closeout: draft, open, unmerged

This PR is intentionally stacked on PR #19. Review/merge order must respect that dependency. Do not merge #20 directly into `main` while its base relationship is unresolved.

## Review focus

Human review should focus on product judgment rather than re-litigating the entire implementation:

1. Confirm the ten behavior contracts match the intended Atal product semantics.
2. Confirm the general/contextual assistant separation remains the desired experience.
3. Confirm PR #19 is the correct accepted base before deciding how PR #20 should be landed.

No merge, force push, or “ready” transition has been performed automatically.

## Residual risks / known boundaries

- The PR is large because it consolidates many previously duplicated mutation paths and adds browser regression coverage. Review should use the parity matrix and changed-file groups rather than reading 200+ commits chronologically.
- Browser tests use deterministic mocked AI turns for action execution. They validate Atal’s execution/persistence/audit behavior, not live Gemini availability or model quality.
- The Behavior System closes behavioral consistency; it does not claim that every future product feature or every possible natural-language phrasing is covered.

## Decision gate

Technical implementation and regression evidence are ready for review.

The remaining action is human/product review of the stacked PR relationship and final merge decision. Until that decision, PR #20 should remain open, draft, and unmerged.
