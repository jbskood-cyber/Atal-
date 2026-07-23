# Block 4.2 — Autonomous execution protocol

## 1. Role

The implementation worker is responsible for constructing, testing, correcting and publishing Block 4.2 on the canonical branch. It must follow the contract, preserve product safety and post evidence directly to GitHub so the user does not relay routine technical results.

The worker is not authorized to merge, mark the PR ready, change the base branch or weaken acceptance criteria.

## 2. Canonical repository state

- Repository: `jbskood-cyber/Atal-`
- Base branch: `main`
- Base SHA: `bce942ff85f573bba678d84cdb53904ab532a52d`
- Working branch: `feature/atal-ai-contextual-workspace-block-4-2`
- Canonical issue: #15
- Canonical contract: `docs/atal-ai/block-4-2/`
- Previous merged block: PR #14 / Block 4.1

Before editing code, the worker must fetch and verify that the working branch descends from the exact base SHA and that no unexpected changes exist.

## 3. Mandatory reading and inspection

Read every contract document in README order.

Then inspect at minimum:

- application shell and bottom navigation;
- current scroll restoration and route behavior;
- patient profile and clinical-record screens;
- plan detail/editor;
- exercise detail/editor/library relationships;
- report/session review surfaces;
- global Atal IA conversation screen;
- existing conversation and draft persistence;
- Block 4.1 execution engine, context, registry, risk, confirmation, transaction, audit and undo adapters;
- overlay/sheet/portal utilities;
- theme and safe-area implementation;
- Playwright config, fixtures, Block 4.1 critical E2E suite and GitHub workflows.

Do not assume file names from the contract. Map responsibilities to the actual repository and document the mapping in the startup comment.

## 4. Git and baseline gate

Execute:

```bash
git fetch origin
git checkout feature/atal-ai-contextual-workspace-block-4-2
git pull --ff-only origin feature/atal-ai-contextual-workspace-block-4-2
git status --short --branch
git rev-parse HEAD
git merge-base --is-ancestor bce942ff85f573bba678d84cdb53904ab532a52d HEAD
```

Stop before product edits if:

- the branch is wrong;
- base ancestry fails;
- working tree has unexplained changes;
- contract files are missing;
- `main` has advanced with changes that materially conflict and the branch has not been deliberately updated.

Run baseline:

```bash
npm_config_cache=/tmp/atal-npm-cache npm ci
npm run typecheck
npm test
npm run build
```

Record exact test count and build output. Inspect current GitHub Actions state.

If installation fails due solely to the execution environment, use GitHub Actions as the validation environment. Do not classify it as a product failure.

## 5. TDD protocol

For every behavior change:

1. identify the smallest observable requirement;
2. add a focused test that fails for the correct reason;
3. record the red result in implementation notes when it is a significant regression/safety case;
4. implement the smallest coherent production change;
5. run the focused test to green;
6. run related tests;
7. run full typecheck/tests/build at checkpoint boundaries;
8. publish a focused commit;
9. confirm CI and post checkpoint evidence.

Do not write a large UI implementation and add tests afterward.

## 6. Commit discipline

Use small, focused commits such as:

- `test: define contextual workspace state transitions`
- `feat: add contextual AI controller`
- `feat: suppress bottom navigation while contextual AI is open`
- `feat: add patient contextual AI trigger`
- `feat: add contextual AI workspace shell`
- `feat: reuse Atal AI conversation in contextual workspace`
- `feat: connect contextual drafts to universal core`
- `test: cover contextual confirmation and undo`
- `fix: preserve scroll when minimizing contextual AI`

Do not combine unrelated refactors, visual polish and core behavior in one commit.

No force push.

## 7. Checkpoint reports

Post a comment to both PR and issue #15 after each checkpoint.

Use this format:

```markdown
## Checkpoint 4.2X — <name>

- Overall progress: **<percent>%**
- HEAD: `<sha>`
- Scope completed: <concise list>
- Files/modules: <actual paths>
- RED evidence: <tests that failed before implementation, when applicable>
- Focused tests: <pass/fail and count>
- Full tests: <pass/fail and total>
- Typecheck: <result>
- Build: <result and measured bundle>
- E2E: <run/result when applicable>
- Store key/version changed: NO/YES with explanation
- Package lock changed: NO/YES with explanation
- Known issues: <honest list>
- Next checkpoint: <name>
```

The startup report must include the real architecture mapping found during inspection.

## 8. Visual implementation protocol

The two user-approved mockups and the textual contract define the target.

The worker must preserve these decisive behaviors:

### Closed

- bottom navigation visible;
- Liquid Glass Atal orb visible at lower-right;
- compact contextual actions when available;
- underlying clinical page fully usable.

### Open

- orb absent;
- exterior contextual actions absent;
- complete bottom navigation absent;
- route unchanged;
- clinical page remains visible behind workspace;
- workspace header/actions/suggestions/conversation/draft/composer visible;
- underlying page inert and scroll preserved.

### Minimize/close

- bottom navigation/orb/actions restored;
- route and scroll restored exactly;
- minimize preserves transient session;
- close clears transient shell without applying a draft.

If the open-state visual mockup visibly retains the nav/orb, the textual correction above wins.

## 9. Reuse and architecture rules

- Build one shared controller and workspace shell.
- Product surfaces provide typed adapters only.
- Reuse existing conversation/draft components where safe.
- Reuse Block 4.1 public execution interfaces.
- Do not duplicate risk, confirmation, transaction, audit or undo.
- Do not create a second clinical or AI persistence store.
- Do not hide bottom navigation with DOM queries or per-screen hacks.
- Do not use route changes to model open/minimized state.
- Do not hardcode patient/demo IDs.

## 10. Testing protocol

### Unit/integration

Cover:

- state transitions;
- exact context identity;
- action availability;
- deterministic suggestions;
- shell/nav visibility;
- scroll/focus restoration;
- conversation/draft adapters;
- Block 4.1 outcome rendering.

### Playwright

Use the established direct Vite method:

- direct base URL `http://127.0.0.1:3000`;
- Chromium primary gate;
- isolated fictitious state per test;
- mock only the external Gemini analyze boundary;
- real contextual UI, store and Block 4.1 core;
- semantic selectors;
- no coordinates;
- no arbitrary sleeps;
- trace/screenshots/video on failure;
- one CI worker.

Expand `e2e/fixtures.mjs` carefully; preserve existing Block 4.1 scenarios.

### Real preview

After deterministic evidence is green, perform only a short Google AI Studio smoke when possible:

- app loads from the tested branch/SHA;
- one contextual read query reaches Gemini;
- one structured proposal can be prepared without an API-key/fatal error;
- no exhaustive AI Studio automation.

## 11. Failure classification

### Product failure

Examples:

- nav/orb remain visible while workspace is open;
- route or scroll changes;
- background remains interactive;
- quick action writes immediately;
- contextual target changes silently;
- confirmation can be bypassed;
- partial mutation or unsafe audit occurs;
- global assistant/manual flows regress;
- keyboard covers composer.

Fix surgically with regression tests.

### Test failure

Examples:

- selector expects copy not mandated by contract;
- test assumes two columns on 360 px;
- fixture omits required entity relationships;
- test expects confirmation before `Aplicar cambios` when the real approved flow prepares a draft first.

Correct the test without weakening behavior.

### Environment failure

Examples:

- package registry unavailable;
- browser install fails before tests;
- hosted runner outage;
- AI Studio session disconnects.

Use GitHub Actions or retry appropriate infrastructure. Do not edit product code to mask it.

## 12. Security and privacy review

Before every final checkpoint, verify:

- no secrets or API keys in code/logs/artifacts;
- no private phone/email/address/contact in audit metadata;
- no base64 images or hidden reasoning in audit;
- no unsafe HTML injection in model-rendered content;
- no model-selected tool risk;
- no direct store mutation from UI actions;
- no ambiguous or stale writes;
- no external action simulated as completed.

## 13. Final validation

On the exact final SHA:

```bash
npm_config_cache=/tmp/atal-npm-cache npm ci
npm run typecheck
npm test
npm run build
npx playwright test
```

Confirm GitHub Actions quality and E2E runs. Inspect jobs, not only run summaries. Download/inspect artifacts when failures occurred and preserve final evidence.

Confirm:

- PR open;
- PR draft;
- PR unmerged;
- base `main`;
- no unexpected branch drift;
- store key/version preserved;
- package-lock status explained;
- issue/PR comments complete.

## 14. Final report

Return:

- exact final SHA;
- commit list;
- files/modules changed;
- checkpoint completion;
- exact unit/integration/E2E counts;
- typecheck/build/workflow results;
- visual viewport/theme results;
- route/scroll/nav suppression results;
- contextual query/draft/confirm/undo results;
- global/manual regression results;
- known limitations;
- PR and issue state.

Use only one conclusion:

- `BLOCK 4.2 APPROVED`
- `BLOCK 4.2 BLOCKED — PRODUCT FAILURE`
- `BLOCK 4.2 BLOCKED — VALIDATION ENVIRONMENT`

Do not mark ready or merge. Final integration requires explicit user authorization after independent evidence.