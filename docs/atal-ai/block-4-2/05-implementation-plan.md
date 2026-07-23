# Block 4.2 — Implementation plan

## Execution rule

Implement task by task using TDD. Each task begins with a focused failing test, proceeds to the smallest implementation that makes it pass, then runs focused and full quality checks before publication.

Do not begin product implementation until the worker has read every contract document in README order, inspected the actual architecture and recorded the baseline.

## Task 0 — Contract and repository baseline

### Required inspection

- confirm repository, branch and exact base ancestry;
- confirm working tree is clean;
- read `docs/atal-ai/block-4-2/` in canonical order;
- inspect the application shell and bottom navigation implementation;
- inspect patient profile, clinical record, plan detail/editor, exercise detail and report surfaces;
- inspect the global Atal IA screen, conversation persistence, draft persistence and composer;
- inspect Block 4.1 execution/context adapters, Tool Registry, confirmation and undo;
- inspect existing Playwright config, fixtures and critical suite;
- inspect theme, safe-area, overlay/sheet and scroll-restoration utilities.

### Baseline commands

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Record:

- Node/npm versions;
- exact test total;
- build output and bundle sizes;
- current `package-lock.json` hash;
- existing E2E workflow status;
- current `ATAL_STORE_KEY` and `ATAL_STORE_VERSION`.

No product file changes in this task.

### Checkpoint

4.2A — canonical contract, baseline and architecture inspection.

---

## Task 1 — Context model and shared state machine

### Goal

Create the typed contextual context model and a tested state machine/controller independent of screen-specific UI.

### Required tests first

- initial mode is closed;
- open captures exact context and route without navigation;
- open records scroll/focus restoration data;
- minimize preserves session/conversation/draft/pane state;
- restore returns to the same context;
- close clears transient state but not persisted conversation/draft identity;
- context target change invalidates pending confirmation/proposal state;
- invalid/missing entity context cannot open a write-capable workspace;
- one controller instance serves all product surfaces.

### Implementation constraints

- no second clinical store;
- no route as UI-state storage;
- no direct DOM query to hide bottom navigation;
- use stable IDs, not labels, for target identity;
- controller can be mounted near the application shell.

### Verification

- focused controller/state tests;
- typecheck;
- full tests;
- build.

### Checkpoint

4.2B — context model and shared workspace state machine.

---

## Task 2 — Application-shell integration and navigation suppression

### Goal

Connect workspace mode to the existing shell so the bottom navigation, orb and exterior actions are mutually exclusive with the open workspace.

### Required tests first

- bottom navigation visible when closed;
- bottom navigation visible when minimized;
- bottom navigation absent when open;
- no nav-sized empty gap while open;
- trigger/orb absent when open;
- exterior actions absent when open;
- closing/minimizing restores all three;
- route does not change;
- browser history length does not change;
- page scroll is restored exactly within tolerance;
- focus returns to originating trigger.

### Implementation constraints

- central shell visibility contract;
- one shared portal/mount point;
- no per-screen nav hiding CSS;
- no fake route or `/assistant` navigation;
- no permanent body-scroll lock after error/close.

### Verification

- component/integration tests;
- focused Playwright shell state test;
- full quality.

### Checkpoint

Part of 4.2D; do not publish as complete until Task 4 shell visual is usable.

---

## Task 3 — Closed patient-context trigger and actions

### Goal

Implement the approved closed state on the patient surface first.

### Required behavior

- compact Liquid Glass orb lower-right above navigation;
- accessible label naming the patient context;
- availability/status indicator;
- contextual actions such as `Actualizar contacto` and `Ver progreso` when available;
- no overlap with primary page actions;
- light and Graphite support;
- 360/390/412/430 responsive behavior;
- reduced-motion support.

### Required tests first

- patient ID/context passed correctly;
- actions shown only when their deterministic availability returns true;
- action click opens workspace with the intended seeded message/intent;
- write-oriented action does not mutate product state on click;
- orb click opens without route/scroll change;
- no horizontal overflow at target widths;
- orb absent on non-contracted list/settings screens.

### Implementation constraints

- reuse current icon/symbol assets;
- use existing tokens;
- no broad patient-screen redesign;
- no hardcoded demo IDs or labels.

### Verification

- focused tests;
- screenshot evidence at 390 light/Graphite;
- full quality.

### Checkpoint

4.2C — closed patient-context trigger and quick actions.

---

## Task 4 — Open shared workspace shell

### Goal

Implement the approved open composition without conversation/core behavior yet beyond placeholder-safe structure.

### Required regions

- header with symbol, title, context chip, minimize and close;
- internal contextual action row;
- proactive suggestion region;
- main work area slots for conversation and draft;
- fixed composer slot;
- responsive mobile pane strategy;
- wider side-by-side strategy.

### Required tests first

- open frame hides bottom navigation/orb/exterior actions;
- exact context chip displayed;
- minimize and close differences preserved;
- minimize restores active pane and internal scroll on reopen;
- close clears transient open panels;
- page behind is inert to pointer/keyboard interaction while open;
- Escape/top-layer behavior is deterministic;
- keyboard-safe composer container remains visible;
- open/close errors cannot strand shell state.

### Implementation constraints

- workspace shell renders immediately without waiting for Gemini;
- no blank panel;
- no cramped forced two-column mobile layout;
- no nested modal focus traps.

### Verification

- component tests;
- Playwright open/minimize/close/scroll/focus test;
- visual artifact matrix;
- full quality.

### Checkpoint

4.2D — open workspace shell, navigation suppression and exact restoration.

---

## Task 5 — Contextual conversation and persistence

### Goal

Reuse the existing Atal IA conversation model inside the shared workspace.

### Required tests first

- same context reopens the same contextual conversation;
- different patient/plan/exercise/report selects a different context thread;
- user message includes exact typed context IDs;
- query response renders without product mutation;
- network/parse error remains recoverable;
- retry does not duplicate messages or transaction proposals;
- minimize/restore keeps transcript scroll;
- `Abrir en Atal IA` explicitly continues the selected thread when implemented;
- hidden reasoning/private metadata never renders or persists in audit.

### Implementation constraints

- extract/reuse global conversation pieces instead of copying the screen;
- preserve global `/assistant` behavior;
- no second conversation storage key without a documented compatibility need;
- no token-streaming requirement unless already supported.

### Verification

- focused conversation tests;
- deterministic mocked Gemini E2E query;
- global assistant regression;
- full quality.

---

## Task 6 — Composer and contextual actions

### Goal

Deliver the operational composer and action starters.

### Required tests first

- empty input shows microphone only when real capture is available; otherwise approved fallback;
- text input shows send and not microphone as competing primary action;
- multiline bounded growth;
- successful send clears input exactly once;
- failure retains recoverable text as appropriate;
- `+` opens only real available actions/capabilities;
- exterior action and internal action generate the same typed intent/context;
- write action creates a proposal/draft with zero product mutation;
- keyboard does not cover composer.

### Implementation constraints

- no fake attachments/voice recording;
- no direct mutation from quick actions;
- preserve Android cursor stability and safe areas.

---

## Task 7 — Suggestions and structured draft panel

### Goal

Add deterministic contextual suggestions and reuse the structured draft system.

### Required tests first

- suggestion rules use stored facts only;
- missing contact rule appears/disappears correctly;
- no suggestion display creates an audit success event;
- action launches correct intent/context;
- draft edits change draft persistence only;
- one draft section open at a time on mobile;
- stale version disables apply and shows conflict;
- progress values reflect actual completion;
- close/minimize never auto-applies a draft.

### Implementation constraints

- deterministic rule owns suggestion condition;
- Gemini may phrase but not invent reason;
- reuse current draft adapters/editors where compatible;
- no pencil per field.

### Checkpoint

4.2E — conversation, actions, suggestions, draft and composer integration.

---

## Task 8 — Block 4.1 execution-core integration

### Goal

Complete query, draft, clarification, confirmation, execution, result, audit and undo inside the contextual workspace.

### Required tests first

- read query leaves full store unchanged;
- reversible write remains unchanged before apply/confirmation;
- cancel leaves zero mutation/success audit;
- confirmation names exact action/entity;
- target/input change invalidates proof;
- ambiguity produces candidates and zero mutation;
- stale draft produces conflict and zero partial mutation;
- successful write creates expected transaction-level audit;
- audit excludes private contact/base64/reasoning;
- undo restores exact prior state when receipt valid;
- expired/version-mismatched undo is rejected;
- same invocation behaves equivalently in global and contextual surfaces.

### Implementation constraints

- use the existing public core entry point;
- no UI-owned risk classification;
- no manual optimistic store patch;
- no duplicated executor or undo code.

### Verification

- focused core-adapter tests;
- deterministic Playwright write/confirm/undo test;
- full Block 4.1 regression;
- full quality.

### Checkpoint

4.2F — universal core integration, confirmation, audit and undo.

---

## Task 9 — Reuse across required contexts

### Goal

Integrate the same trigger/controller/workspace architecture into clinical record, plan, exercise and report surfaces.

### Required tests first for every surface

- exact context IDs and label;
- correct available actions;
- no trigger on unrelated/list/settings surfaces;
- open hides navigation/orb/actions;
- route/scroll/focus restoration;
- one read action;
- one draft/write proposal where supported;
- ambiguity/parent-relationship safety;
- light and Graphite mobile smoke.

### Implementation constraints

- adapters only; no copied workspace;
- no surface-specific mutation path;
- parent relationships remain exact (exercise-plan-patient, report-session-plan-patient).

---

## Task 10 — Responsive polish, accessibility and performance

### Required work

- complete viewport matrix;
- keyboard and safe-area behavior;
- focus containment/restoration;
- reduced motion;
- contrast and semantic states;
- lazy mounting and render audit;
- bundle-size comparison;
- page/console error cleanup;
- no double scroll or horizontal overflow.

### Required evidence

- screenshots/artifacts for target widths and themes;
- keyboard/composer evidence;
- measured build output;
- accessibility assertions;
- route/scroll preservation results.

### Checkpoint

4.2G — responsive, keyboard, accessibility and performance polish.

---

## Task 11 — Deterministic E2E gate and final evidence

### E2E suite requirements

Extend the existing Playwright method directly against Vite. Mock only the Gemini HTTP boundary. Keep the actual UI, context adapters, Block 4.1 core, store, audit and undo real.

Required critical scenarios:

1. patient closed/open/minimize/close with nav/orb/action suppression and route/scroll restoration;
2. contextual read query with zero mutation;
3. contextual draft with zero pre-apply mutation and persistence after minimize/reload where applicable;
4. reversible write confirmation, audit and exact undo;
5. target change/proof invalidation and stale conflict;
6. plan/exercise/report context identity and parent relationship smoke;
7. 360/390/412/430 light/Graphite layout, overflow, keyboard and fatal-error smoke;
8. global `/assistant` and manual-flow regression.

Run:

```bash
npm run typecheck
npm test
npm run build
npx playwright test
```

Confirm GitHub Actions quality and E2E checks on the exact final SHA. Upload reports/traces/screenshots. Post evidence to issue #15 and the draft PR.

### Checkpoint

4.2H — deterministic regression, functional QA and independent evidence.

---

## Publication rules

- publish small focused commits;
- post checkpoint evidence after each completed checkpoint;
- do not force push;
- do not merge or mark ready;
- classify failures as product, test or environment with evidence;
- fix product defects surgically with regression tests;
- final conclusion is not approval until independent evidence is green and the user explicitly authorizes integration.