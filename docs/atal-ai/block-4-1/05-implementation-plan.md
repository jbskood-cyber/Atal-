# Universal Atal AI Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a typed, deterministic, auditable and reversible execution core for the existing Atal AI flows while preserving `atal:store:v2`, manual workflows and the approved interface.

**Architecture:** Add a registry/resolution/policy/transaction pipeline under `src/features/atal-ai/core/`. Keep the existing store as the only persistence source, refactor legacy AI execution into adapters, and migrate operations incrementally behind compatibility exports. Every mutating operation uses one injected store transaction and validates invariants before persistence.

**Tech Stack:** React 19, TypeScript 5.9, Vite 6, Node 24 test runner, existing local store and localStorage. No new runtime dependency.

## Global Constraints

- Base SHA is exactly `243784ea47a2094d6b44bce5f165cfd53e2c76b6` before documentation commits.
- Work only on `feature/atal-ai-core-block-4-1` and draft PR for issue #13.
- Preserve `ATAL_STORE_KEY === 'atal:store:v2'` and `ATAL_STORE_VERSION === 2`.
- Do not reset local data or change legacy migration behavior.
- Gemini never mutates the store directly and never selects risk.
- No backend, auth, payment, external messaging, new secret or broad visual redesign.
- Use TDD for every behavioral unit.
- Keep the PR in draft; do not merge or mark ready.
- Update issue/PR checkpoint evidence after every task.

---

## File map

### Create

- `.github/workflows/quality.yml` — clean-install/typecheck/test/build CI.
- `tests/tsconfig.core.json` — emit testable CommonJS copies of core TypeScript into `.tmp/core-tests`.
- `tests/helpers/core-modules.mjs` — typed-module loader for compiled core files.
- `tests/atal-ai-core-contracts.test.mjs`
- `tests/atal-ai-core-registry.test.mjs`
- `tests/atal-ai-core-resolution.test.mjs`
- `tests/atal-ai-core-policy.test.mjs`
- `tests/atal-ai-core-transaction.test.mjs`
- `tests/atal-ai-core-undo.test.mjs`
- `tests/atal-ai-core-adapters.test.mjs`
- `src/features/atal-ai/core/contracts.ts`
- `src/features/atal-ai/core/stableValue.ts`
- `src/features/atal-ai/core/toolRegistry.ts`
- `src/features/atal-ai/core/entityResolver.ts`
- `src/features/atal-ai/core/riskPolicy.ts`
- `src/features/atal-ai/core/stateInvariants.ts`
- `src/features/atal-ai/core/transactionEngine.ts`
- `src/features/atal-ai/core/undoEngine.ts`
- `src/features/atal-ai/core/executionEngine.ts`
- `src/features/atal-ai/core/legacyAdapters.ts`
- `src/features/atal-ai/core/atalStorePort.ts`
- `src/features/atal-ai/core/tools/queryTools.ts`
- `src/features/atal-ai/core/tools/patientTools.ts`
- `src/features/atal-ai/core/tools/planTools.ts`
- `src/features/atal-ai/core/tools/exerciseTools.ts`
- `src/features/atal-ai/core/tools/settingsTools.ts`
- `src/features/atal-ai/core/tools/exportTools.ts`

### Modify

- `.gitignore` — ignore `.tmp/`.
- `package.json` — compile core test target before Node tests; no dependency changes.
- `src/data/atalStore.ts` — optional backward-compatible audit fields only; no key/version change.
- `src/features/atal-ai/types.ts` — saved result uses compatible core undo receipt shape while retaining old fields during migration.
- `src/features/atal-ai/data/commandRegistry.ts` — compatibility wrapper over core.
- `src/features/atal-ai/data/applyDraft.ts` — compatibility wrapper and/or extracted pure transformation; no direct independent transaction.
- `src/features/atal-ai/AtalAIConversationScreen.tsx` — handle core result union, confirmations and client download effect.
- Existing tests affected by changed imports/contracts.

---

### Task 1: Lock the baseline and add CI

**Files:**
- Create: `.github/workflows/quality.yml`
- Create: `tests/tsconfig.core.json`
- Create: `tests/helpers/core-modules.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run test:core:compile`, compiled modules under `.tmp/core-tests`, and PR CI named `quality`.

- [ ] **Step 1: Verify exact baseline before code changes**

Run:

```bash
git fetch origin
git checkout feature/atal-ai-core-block-4-1
git status --short --branch
git merge-base --is-ancestor 243784ea47a2094d6b44bce5f165cfd53e2c76b6 HEAD
npm ci
npm run typecheck
npm test
npm run build
```

Expected: clean tracked tree before implementation; base is ancestor; 43 tests pass; build succeeds. Documentation commits are expected ahead of base.

- [ ] **Step 2: Add the isolated compile target**

Create `tests/tsconfig.core.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "../.tmp/core-tests",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2022",
    "declaration": false,
    "sourceMap": false,
    "incremental": false
  },
  "include": [
    "../src/features/atal-ai/core/**/*.ts",
    "../src/features/atal-ai/types.ts",
    "../src/data/atalStore.ts",
    "../src/data/atal-demo.ts",
    "../src/domain/planAssociation.ts",
    "../src/features/clinical-record/types.ts",
    "../src/features/guided-session/types.ts"
  ]
}
```

Create `tests/helpers/core-modules.mjs`:

```js
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../.tmp/core-tests');

export function loadCore(relativePath) {
  return require(resolve(root, relativePath));
}
```

Add `.tmp/` to `.gitignore`.

- [ ] **Step 3: Update scripts without dependencies**

Update `package.json` scripts to include:

```json
{
  "test:core:compile": "rm -rf .tmp/core-tests && tsc -p tests/tsconfig.core.json",
  "test": "npm run test:core:compile && node --test tests/*.test.mjs"
}
```

Keep existing `quality` as `npm run typecheck && npm test && npm run build`.

- [ ] **Step 4: Add CI**

Create `.github/workflows/quality.yml`:

```yaml
name: quality

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run quality
```

- [ ] **Step 5: Verify baseline under new runner**

Run:

```bash
npm run quality
git status --short
```

Expected: all pre-existing tests plus compile setup pass; only intended files changed; `.tmp` absent from Git status.

- [ ] **Step 6: Commit and publish checkpoint 4.1A evidence**

```bash
git add .github/workflows/quality.yml tests/tsconfig.core.json tests/helpers/core-modules.mjs .gitignore package.json
git commit -m "test: add Block 4.1 quality safety net"
git push origin feature/atal-ai-core-block-4-1
```

Post exact command results to the draft PR and check 4.1A only after CI is green.

---

### Task 2: Core contracts and stable fingerprints

**Files:**
- Create: `src/features/atal-ai/core/contracts.ts`
- Create: `src/features/atal-ai/core/stableValue.ts`
- Create: `tests/atal-ai-core-contracts.test.mjs`

**Interfaces:**
- Produces: all types listed in `02-core-architecture.md`; `stableSerialize(value)`, `normalizeEntityLabel(value)`, `fingerprintInvocation(invocation)`.

- [ ] **Step 1: Write failing behavioral tests**

Create `tests/atal-ai-core-contracts.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const stable = () => loadCore('src/features/atal-ai/core/stableValue.js');

test('stable serialization ignores object key insertion order', () => {
  const { stableSerialize } = stable();
  assert.equal(
    stableSerialize({ b: 2, a: { d: 4, c: 3 } }),
    stableSerialize({ a: { c: 3, d: 4 }, b: 2 }),
  );
});

test('entity labels normalize accents case and whitespace', () => {
  const { normalizeEntityLabel } = stable();
  assert.equal(normalizeEntityLabel('  José   Álvarez '), 'jose alvarez');
});

test('proposal fingerprint changes when validated input changes', () => {
  const { fingerprintInvocation } = stable();
  const base = { tool: 'plan.pause', version: 1, input: { planId: 'p1' }, references: [], proposalId: 'q1' };
  assert.notEqual(fingerprintInvocation(base), fingerprintInvocation({ ...base, input: { planId: 'p2' } }));
});
```

- [ ] **Step 2: Run compile/test and confirm failure**

```bash
npm test -- --test-name-pattern="stable serialization|entity labels|proposal fingerprint"
```

Expected: compile failure because modules do not exist.

- [ ] **Step 3: Implement exact contracts and stable functions**

Implement the unions and interfaces from architecture documents. `stableSerialize` recursively sorts object keys, preserves array order, serializes `undefined` as a deterministic sentinel, rejects functions/symbols/cycles, and never includes prototype properties.

Use a deterministic non-security hash such as FNV-1a over the stable string. Document that it is an invalidation fingerprint, not an authentication mechanism.

- [ ] **Step 4: Run tests and typecheck**

```bash
npm run typecheck
npm test
```

Expected: all existing and new tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/atal-ai/core/contracts.ts src/features/atal-ai/core/stableValue.ts tests/atal-ai-core-contracts.test.mjs
git commit -m "feat: define typed Atal AI core contracts"
```

---

### Task 3: Typed Tool Registry and risk policy

**Files:**
- Create: `src/features/atal-ai/core/toolRegistry.ts`
- Create: `src/features/atal-ai/core/riskPolicy.ts`
- Create: `tests/atal-ai-core-registry.test.mjs`
- Create: `tests/atal-ai-core-policy.test.mjs`

**Interfaces:**
- Consumes: `ToolDefinition`, `ToolRisk`, `ToolInvocation`, `ConfirmationProof`, `PolicyDecision`, `fingerprintInvocation`.
- Produces: `createToolRegistry(definitions)`, `registry.get(name)`, `registry.list()`, `decideExecutionPolicy(definition, invocation, proof, now)`.

- [ ] **Step 1: Write registry tests**

Test duplicate rejection, unknown lookup, mutating read-tool rejection and deterministic listing:

```js
test('registry rejects duplicate stable names', () => {
  const { createToolRegistry } = registry();
  assert.throws(() => createToolRegistry([definition('plan.pause'), definition('plan.pause')]), /duplicate/i);
});

test('registry rejects a mutating tool classified as read', () => {
  const { createToolRegistry } = registry();
  assert.throws(() => createToolRegistry([definition('bad.tool', { risk: 'read', mutates: true })]), /read/i);
});
```

- [ ] **Step 2: Write policy tests**

Cover all six risks, stale proof, fingerprint mismatch, proof strength and 5-minute expiry.

- [ ] **Step 3: Verify tests fail, then implement minimal registry/policy**

`decideExecutionPolicy` returns `blocked` for external, required mode for other risks, and `none` only for read. It must ignore any risk property present in invocation input.

- [ ] **Step 4: Run full quality and commit**

```bash
npm run quality
git add src/features/atal-ai/core/toolRegistry.ts src/features/atal-ai/core/riskPolicy.ts tests/atal-ai-core-registry.test.mjs tests/atal-ai-core-policy.test.mjs
git commit -m "feat: add Atal AI registry and risk policy"
```

Post 4.1B evidence when contracts/registry/policy are green and still unused by product behavior.

---

### Task 4: Deterministic entity resolution

**Files:**
- Create: `src/features/atal-ai/core/entityResolver.ts`
- Create: `tests/atal-ai-core-resolution.test.mjs`

**Interfaces:**
- Consumes: `AtalState`, `ToolInvocation`, `ExecutionContext`, normalized labels.
- Produces: `resolveEntities(state, invocation, context): ResolutionResult`.

- [ ] **Step 1: Build in-memory fixtures**

Fixtures must contain:

- two patients with different IDs and names;
- two patients whose names normalize to the same label;
- plans belonging to different patients;
- one active and one draft plan;
- exercises with same name but different regions;
- sessions tied to patient/plan pairs;
- clinical records.

- [ ] **Step 2: Write failing precedence tests**

Cover:

- valid explicit ID wins;
- invalid explicit ID does not fall back;
- selected context is used only for matching type;
- unique exact normalized label resolves;
- duplicate normalized label returns candidates;
- plan/patient mismatch returns relation clarification;
- session/plan/patient mismatch returns relation clarification;
- write never uses fuzzy/first/newest match.

- [ ] **Step 3: Implement resolver without mutation**

Do not import store mutation functions. Freeze fixture state in a test and assert no change after resolution.

- [ ] **Step 4: Run and commit**

```bash
npm run quality
git add src/features/atal-ai/core/entityResolver.ts tests/atal-ai-core-resolution.test.mjs
git commit -m "feat: resolve Atal AI entities deterministically"
```

Post 4.1C evidence including ambiguity and relationship tests.

---

### Task 5: Invariants, transaction engine and undo

**Files:**
- Create: `src/features/atal-ai/core/stateInvariants.ts`
- Create: `src/features/atal-ai/core/transactionEngine.ts`
- Create: `src/features/atal-ai/core/undoEngine.ts`
- Create: `src/features/atal-ai/core/atalStorePort.ts`
- Create: `tests/atal-ai-core-transaction.test.mjs`
- Create: `tests/atal-ai-core-undo.test.mjs`
- Modify: `src/data/atalStore.ts`

**Interfaces:**
- Produces: `validateAtalStateInvariants`, `executeMutationTransaction`, `executeUndo`, `atalStorePort`.
- `StorePort` exact shape:

```ts
export type StorePort = {
  read(): AtalState;
  mutate(mutator: (candidate: AtalState) => void): AtalState;
};
```

- [ ] **Step 1: Write invariant tests**

Use valid seed-like fixture and create one failing test for each invariant category: duplicate IDs, missing patient relation, missing exercise relation, session relation mismatch, two active plans, active plan without exercises, invalid sets, invalid record version increment.

- [ ] **Step 2: Write transaction rollback tests with an in-memory port**

```js
function memoryPort(initial) {
  let state = structuredClone(initial);
  return {
    read: () => state,
    mutate(mutator) {
      const candidate = structuredClone(state);
      mutator(candidate);
      state = candidate;
      return state;
    },
  };
}
```

Test success, executor throw, invariant throw, audit count, one mutation call and no partial writes.

- [ ] **Step 3: Implement invariants and transaction sequence from document 04**

`transactionEngine` accepts `StorePort` as a parameter with default `atalStorePort`. Tool tests use memory port. The actual adapter delegates to current `getAtalState` and `mutateAtalStore`.

- [ ] **Step 4: Extend activity audit fields compatibly**

Add only optional fields to `ActivityEvent`. Do not change state version/key/loading behavior.

- [ ] **Step 5: Write undo tests**

Cover restore existing entity, remove created composite data, expiry, stale `updatedAt`, dependency reference preventing removal, exact generated event cleanup and audit `undone` event.

- [ ] **Step 6: Implement undo through one transaction**

Do not reuse legacy `undoAICommand` internals. Keep legacy export as adapter later.

- [ ] **Step 7: Run full quality and commit**

```bash
npm run quality
git add src/features/atal-ai/core/stateInvariants.ts src/features/atal-ai/core/transactionEngine.ts src/features/atal-ai/core/undoEngine.ts src/features/atal-ai/core/atalStorePort.ts src/data/atalStore.ts tests/atal-ai-core-transaction.test.mjs tests/atal-ai-core-undo.test.mjs
git commit -m "feat: add atomic Atal AI transactions and undo"
```

Post 4.1E evidence only after rollback and stale-undo tests pass.

---

### Task 6: Register query and direct tools

**Files:**
- Create: `src/features/atal-ai/core/tools/queryTools.ts`
- Create: `src/features/atal-ai/core/tools/patientTools.ts`
- Create: `src/features/atal-ai/core/tools/planTools.ts`
- Create: `src/features/atal-ai/core/tools/settingsTools.ts`
- Create: `src/features/atal-ai/core/tools/exportTools.ts`
- Create/modify: `tests/atal-ai-core-registry.test.mjs`
- Create: `src/features/atal-ai/core/executionEngine.ts`

**Interfaces:**
- Produces the exact stable tool names in document 03 and `executeToolInvocation(request, options?)`.

- [ ] **Step 1: Write tool behavior tests before each domain implementation**

Minimum cases:

- patient search has no state changes;
- patient summary requires unique patient;
- note add trims/rejects empty/undoes created note;
- plan state transition preconditions;
- active conflict rejects `plan.activate`;
- `plan.replace_active` changes two plans atomically and undoes both;
- settings unknown key rejected;
- local export returns a download descriptor and performs no anchor click/network call.

- [ ] **Step 2: Implement focused tool definitions**

Executors mutate only the supplied candidate state and use transaction time/ID helpers. Do not call existing store convenience functions that open their own transaction.

- [ ] **Step 3: Implement execution orchestration**

`executeToolInvocation` order:

```ts
registry lookup
→ input validation
→ entity resolution
→ policy decision
→ clarification/confirmation/blocked result when gated
→ read executor or mutation transaction
→ safe error conversion
```

- [ ] **Step 4: Run quality and commit**

```bash
npm run quality
git add src/features/atal-ai/core/tools src/features/atal-ai/core/executionEngine.ts tests/atal-ai-core-registry.test.mjs tests/atal-ai-core-transaction.test.mjs
git commit -m "feat: register Atal AI query and command tools"
```

---

### Task 7: Migrate draft application as typed composite tools

**Files:**
- Create: `src/features/atal-ai/core/tools/exerciseTools.ts`
- Extend: `src/features/atal-ai/core/tools/patientTools.ts`
- Extend: `src/features/atal-ai/core/tools/planTools.ts`
- Create: `src/features/atal-ai/core/legacyAdapters.ts`
- Modify: `src/features/atal-ai/data/applyDraft.ts`
- Create: `tests/atal-ai-core-adapters.test.mjs`

**Interfaces:**
- Produces: `invocationFromDraft`, `invocationFromCommand`, `executeLegacyAIAction`.

- [ ] **Step 1: Write adapter completeness test**

Define arrays of all current `AtalAIIntent` mutating values and `AICommandType` values. Assert every value maps exactly once to a registered tool or documented query path.

- [ ] **Step 2: Write composite draft tests**

Cover:

- new patient + record + exercises + plan success;
- duplicate patient clarification;
- exercise reuse versus intentional create-new;
- active-plan conflict rollback;
- failure after exercise creation leaves no exercise/patient/record/plan;
- record update adds one version;
- plan update preserves ID/createdAt;
- version conflict blocks mutation;
- complete composite undo.

- [ ] **Step 3: Extract pure candidate-state logic from `applyDraft.ts`**

Do not wrap the old `applyAtalAIDraft` inside another transaction. Move mutation logic into domain tool executors so one store transaction owns the complete operation.

- [ ] **Step 4: Keep compatibility export**

`applyAtalAIDraft` may remain with its current signature temporarily, but it must translate to a core invocation, supply review proof from the existing Apply action and return a compatible result. Add a source test asserting it no longer calls `mutateAtalStore` directly.

- [ ] **Step 5: Run quality and commit**

```bash
npm run quality
git add src/features/atal-ai/core/tools src/features/atal-ai/core/legacyAdapters.ts src/features/atal-ai/data/applyDraft.ts tests/atal-ai-core-adapters.test.mjs
git commit -m "refactor: route Atal AI drafts through core tools"
```

---

### Task 8: Migrate legacy commands and conversation UI

**Files:**
- Modify: `src/features/atal-ai/data/commandRegistry.ts`
- Modify: `src/features/atal-ai/AtalAIConversationScreen.tsx`
- Modify: `src/features/atal-ai/types.ts`
- Modify: existing Atal AI tests

**Interfaces:**
- Legacy exports remain callable but delegate to `executeLegacyAIAction`/`executeUndo`.
- Conversation handles `clarification`, `confirmation-required`, `blocked`, `error`, `success`.

- [ ] **Step 1: Add failing source/behavior tests**

Assert:

- legacy registry has no direct `mutateAtalStore`, `updatePlanStatus`, `updateSettings` or browser download implementation;
- React screen does not classify risk;
- download descriptor is executed only in UI adapter after confirmed success;
- success result persists compatible `savedResult` and undo receipt;
- confirmation dialog fingerprint is tied to current invocation;
- changed proposal invalidates old confirmation.

- [ ] **Step 2: Replace direct legacy execution**

Keep user-visible messages/navigation compatible. The screen may translate core results to current notice/error/saved result state, but all execution decisions come from the core.

- [ ] **Step 3: Preserve draft UI behavior**

Manually verify expand/edit/save/cancel/reload/apply remains unchanged. No broad CSS edits.

- [ ] **Step 4: Run quality and commit**

```bash
npm run quality
git add src/features/atal-ai/data/commandRegistry.ts src/features/atal-ai/AtalAIConversationScreen.tsx src/features/atal-ai/types.ts tests
git commit -m "refactor: connect Atal AI conversation to universal core"
```

Post 4.1F evidence with mapped operations and screenshots/runtime checks.

---

### Task 9: Final regression, documentation and handoff

**Files:**
- Modify: this contract only when implementation revealed an approved factual correction.
- Modify: draft PR body/checklist and issue #13 comments.

- [ ] **Step 1: Clean-room validation**

```bash
rm -rf node_modules .tmp
HOME=/tmp/atal-npm-home \
NPM_CONFIG_CACHE=/tmp/atal-npm-cache \
NPM_CONFIG_USERCONFIG=/tmp/atal-user.npmrc \
NPM_CONFIG_GLOBALCONFIG=/tmp/atal-global.npmrc \
npm ci --cache=/tmp/atal-npm-cache
npm run typecheck
npm test
npm run build
```

Record exact counts, durations and warnings.

- [ ] **Step 2: Functional regression matrix**

Execute the cases in `06-test-and-acceptance-matrix.md`, including manual patient/record/plan/exercise/session flows and Atal AI read/draft/reversible/sensitive/undo flows.

- [ ] **Step 3: Inspect diff and architecture boundaries**

```bash
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git status --short --branch
```

Search for bypasses:

```bash
grep -R "mutateAtalStore\|updatePlanStatus\|updateSettings" src/features/atal-ai --exclude-dir=core
grep -R "risk.*input\|input.*risk" src/features/atal-ai/core
```

Every remaining non-core mutation reference must be an explicitly documented manual UI path or compatibility adapter that delegates without mutation.

- [ ] **Step 4: Publish evidence**

Update draft PR with:

- final SHA;
- CI links/status;
- test counts;
- build result;
- mapping table of old operation → new tool;
- rollback/ambiguity/confirmation/undo evidence;
- functional screenshots;
- known non-blocking warnings;
- explicit statement that no secret/external integration/store version change occurred.

- [ ] **Step 5: Leave PR in draft**

Do not mark ready and do not merge. Comment on issue #13 that 4.1G is implementation-complete and awaiting independent review.

---

## Plan self-review record

- Every scope item maps to a task.
- No store-key/version migration exists.
- Registry, resolver, policy, transaction, audit, undo and legacy integration have separate tests/tasks.
- No new dependency is required.
- External/destructive operations remain blocked.
- Existing manual workflows and 43-test baseline are included in final acceptance.
- The implementation is decomposed into independently reviewable commits and checkpoints.
