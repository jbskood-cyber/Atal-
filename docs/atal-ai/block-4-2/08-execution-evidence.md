# Block 4.2 — Execution evidence

This file records implementation evidence for the canonical contextual Atal AI workspace.

## 4.2A — Baseline and architecture inspection

- Base branch: `main`
- Base SHA: `bce942ff85f573bba678d84cdb53904ab532a52d`
- Working branch: `feature/atal-ai-contextual-workspace-block-4-2`
- PR: #16, open, draft, unmerged
- Initial documentation HEAD: `970d325d522481054fc018f44ccab7828e1bca72`
- Initial baseline: quality #27 PASS; e2e #4 PASS.
- All canonical documents were read in README order before product edits.
- Architecture inspected: persistent shell and bottom dock, patient/profile, clinical record, plan, exercise, report, global Atal IA, AI persistence, Block 4.1 execution core, confirmation, transaction, audit, undo and deterministic Playwright fixtures.
- Execution environment note: the local runtime had no outbound GitHub access. The authenticated GitHub branch remained the isolated source workspace and GitHub Actions remained the execution source of truth, as allowed by the autonomous protocol.

## 4.2B — Context model and shared state machine

TDD evidence:

1. `tests/contextual-ai-state.test.mjs` was committed before the implementation module.
2. quality #29 failed because `stateMachine` did not exist, proving RED for the intended reason.
3. The contextual contracts and state machine were implemented.
4. quality #31 passed.
5. Action/suggestion and conversation-adapter tests were committed before their implementation modules.

Implemented contracts:

- explicit patient, clinical-record, plan, exercise and report context;
- closed, open and minimized states;
- route, page scroll, trigger focus, active pane, expanded draft section and internal scroll preservation;
- stale target/pending proposal invalidation;
- stable contextual conversation identity without a second persistence key;
- deterministic surface-specific actions and suggestions from stored data only.

## 4.2C–F — Shared contextual workspace

The completed implementation includes:

- compact Liquid Glass contextual orb;
- up to two exterior context actions;
- shared workspace controller;
- complete bottom-navigation suppression while open;
- underlying page inertness and scroll lock;
- exact restoration after minimize/close;
- persisted contextual conversation continuity;
- internal actions and deterministic suggestions;
- operational conversation and structured draft pane;
- Gemini request through the existing API client;
- Block 4.1 execution path through `executeLegacyAIAction`;
- confirmation proofs, audit, transaction and structured undo through the existing core;
- patient, clinical-record, plan, exercise and report context adapters;
- microphone-or-send composer behavior;
- responsive Claro and Graphite layouts.

## User visual-smoke correction

The first Google AI Studio visual review approved the report workspace placement and structured draft, but exposed two cross-surface placement defects:

1. Patient and clinical-record launchers were mounted inside long scrolling screens, so the user could need to reach the bottom before accessing Atal IA.
2. Plan used a special raised offset that placed the orb and quick actions over exercise cards instead of matching the approved report anchor.

Systematic diagnosis confirmed the launcher was fixed relative to transformed/scrolling screen containers on patient/record, while plan explicitly used the obsolete `raised` variant.

TDD correction evidence:

- regression test commit `b6fc36ec5ed9e9a068512b94016953e72066fa35` added a viewport-geometry comparison against Reporte clínico;
- quality #81 passed while e2e #58 failed, proving the visual defect without a product regression;
- `ContextualAISurface` now mounts through a global React portal;
- plan, exercise and report use one standard launcher anchor;
- the obsolete raised CSS path was removed;
- patient, clinical record, plan and exercise are compared against the report bottom gap without automatic scrolling;
- successful evidence includes named screenshots for report reference, patient, clinical record, plan and exercise.

## Final verification

Exact final HEAD:

`6ebad2036629af0f5724800a6cdd7635a2e90bfb`

Final GitHub Actions evidence:

- quality #85 / run ID `29985544527`: PASS;
- e2e #62 / run ID `29985544552`: PASS;
- Playwright: 28 expected, 28 passed, 0 unexpected, 0 flaky, 0 skipped;
- evidence artifact: `playwright-evidence`, ID `8554866070`, retained through 2026-08-06;
- screenshot evidence confirms patient, clinical record, plan and exercise share the report launcher anchor at initial viewport scroll position.

## Protected invariants

- `atal:store:v2` unchanged.
- store version remains `2`.
- existing AI conversation and draft persistence reused.
- no second clinical store or mutation path.
- no backend, deployment, secrets, auth, payments or unrelated redesign.
- structured draft design approved by the user and left unchanged.
- PR remains draft and unmerged pending final visual approval and explicit merge authorization.
