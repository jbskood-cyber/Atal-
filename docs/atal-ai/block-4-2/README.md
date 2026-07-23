# Atal AI — Block 4.2 canonical contract

## Status

- Canonical issue: [#15 — Block 4.2: Contextual Atal AI workspace](https://github.com/jbskood-cyber/Atal-/issues/15)
- Base branch: `main`
- Base SHA: `bce942ff85f573bba678d84cdb53904ab532a52d`
- Working branch: `feature/atal-ai-contextual-workspace-block-4-2`
- Previous block: 4.1 approved and merged through PR #14
- Safety foundation available: universal typed registry, deterministic entity resolution, code-owned risk, confirmation proofs, atomic transactions, structured audit and validated undo

This directory is the canonical implementation contract for Block 4.2. Prompts, chat summaries, issue comments and implementation notes may provide execution context, but may not weaken, replace or contradict these documents.

## User-approved visual references

The product direction was fixed through two user-supplied mobile mockups:

1. **Closed contextual state** — current clinical screen visible, bottom navigation visible, compact Liquid Glass Atal orb at the lower-right and compact contextual actions beside it.
2. **Open contextual workspace** — floating operational workspace over the current clinical screen with header, context, quick actions, proactive suggestions, conversation, structured draft and composer.

The mockups are composition references. One explicit user correction has higher precedence than any conflicting pixels in the open-state reference:

> When the contextual workspace opens, the Atal orb, all exterior contextual actions and the complete bottom navigation must disappear.

The current route and clinical screen remain in place behind the workspace. Minimize and close restore the exact previous route, scroll position, orb, contextual actions and bottom navigation.

## Required reading order

1. `01-product-and-visual-contract.md`
2. `02-interaction-state-and-shell-architecture.md`
3. `03-context-actions-drafts-and-core-integration.md`
4. `04-responsive-accessibility-and-performance.md`
5. `05-implementation-plan.md`
6. `06-test-and-acceptance-matrix.md`
7. `07-autonomous-execution-protocol.md`

## Precedence

When instructions conflict, apply this order:

1. Protection of clinical data, existing persisted data and Block 4.1 safety invariants.
2. The explicit user correction in this README: no orb, exterior actions or bottom navigation while open.
3. The product and visual contract in document 01.
4. The state and shell architecture in document 02.
5. The context/action/core integration contract in document 03.
6. Responsive, accessibility and performance requirements in document 04.
7. Test and acceptance requirements in document 06.
8. Task sequencing in document 05.
9. Issue #15 and draft PR checklists.
10. Execution-chat instructions.
11. Implementation convenience.

The worker must stop rather than guess when a material conflict remains after applying this order.

## Objective

Make Atal AI available inside the physiotherapist's active clinical work without forcing navigation to the global `/assistant` route and without creating separate assistants or execution paths.

The contextual workspace must feel like a native operational layer of Atal:

- contextual rather than generic;
- compact when closed;
- focused and capable when open;
- visually integrated with Atal Native Clinical;
- safe because every query, draft and mutation reuses the universal Block 4.1 core;
- reversible and auditable when an action supports undo.

## Required delivery shape

Block 4.2 is built in this order:

1. patient and clinical-record vertical slice;
2. shared reusable workspace architecture;
3. plan context;
4. exercise context;
5. report context;
6. deterministic E2E evidence and independent validation.

Guided-session voice behavior is not part of this block unless a later contract amendment explicitly adds it. The global Atal AI screen remains available and compatible.

## Existing architecture that must be protected

- Persistent store key: `atal:store:v2`.
- Store version: `2`.
- Existing manual patient, record, plan, exercise, session, report and settings flows.
- Existing AI conversations and drafts.
- Existing global Atal AI route and approved conversation behavior.
- The Block 4.1 Tool Registry, risk policy, confirmation, transaction, audit and undo machinery.
- Existing route parameters, browser history and back behavior.
- Blue Clinical and Graphite Clinical themes, current safe areas and mobile navigation conventions.
- The deterministic Playwright method documented in `docs/testing/deterministic-playwright-e2e.md`.

## Non-negotiable constraints

- Do not create a second AI engine, store, registry, risk classifier or mutation path.
- Do not let Gemini directly modify product state.
- Do not change route when opening, minimizing, restoring or closing the contextual workspace.
- Do not lose or reset the underlying page scroll position.
- Do not display the bottom navigation, the orb or exterior quick actions while the workspace is open.
- Do not persist a real entity merely because a draft section was edited.
- Do not execute ambiguous writes.
- Do not hide confirmation requirements inside conversational copy.
- Do not invent clinical facts or autonomous diagnosis.
- Do not add backend, authentication, payments, external messaging, deployment or new secrets.
- Do not broadly redesign unrelated screens.
- Do not mark the PR ready or merge without independent validation and explicit user authorization.

## Definition of done

Block 4.2 is complete only when:

- closed and open states match the canonical behavior;
- patient, clinical-record, plan, exercise and report contexts use one shared architecture;
- route, browser history, scroll and focus are preserved;
- bottom navigation/orb/exterior actions are absent while open and restored after minimize/close;
- quick actions and suggestions are context-specific and never bypass review or policy;
- conversation and structured drafts reuse existing persistence;
- query, draft, apply, confirmation, audit and undo travel through Block 4.1;
- no manual/global AI workflow regresses;
- mobile keyboard, safe areas, light and Graphite themes remain usable;
- typecheck, all automated tests, production build and deterministic Playwright suites pass on the final SHA;
- evidence is posted to issue #15 and the canonical draft PR;
- the PR remains draft until explicit approval.