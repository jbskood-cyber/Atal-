# Block 4.1 — Autonomous execution protocol

## 1. Purpose

This protocol lets a new ChatGPT Work/Codex construction session execute Block 4.1 without depending on the user to relay reports between chats. GitHub is the coordination surface and source of truth.

The construction worker owns implementation, local verification, commits, push and checkpoint evidence. The directing/reviewing ChatGPT inspects GitHub directly. The user is needed only for product decisions, explicit high-risk authorization and final merge authorization.

## 2. Roles

### Product owner — Josue

- approves product direction and material scope changes;
- performs or judges visual/product acceptance when needed;
- authorizes ready/merge actions;
- does not manually shuttle routine technical reports.

### Directing ChatGPT

- owns architecture and this canonical contract;
- reviews issue, PR, diff, commits, evidence and CI directly in GitHub;
- resolves contract ambiguities;
- requests targeted corrections;
- decides whether independent validation may begin;
- never treats the worker's self-report as final approval.

### Construction worker

- reads the complete contract before code changes;
- executes the implementation plan task-by-task;
- uses TDD and focused commits;
- fixes failures introduced by its own changes;
- pushes to the canonical branch;
- posts checkpoint evidence directly on the draft PR and issue #13;
- leaves the PR in draft and unmerged.

### Independent validator

- validates the final SHA without modifying product files;
- runs clean install/typecheck/tests/build/runtime/functional matrix;
- reports one approved/blocked conclusion;
- does not merge.

## 3. Canonical GitHub objects

- Repository: `jbskood-cyber/Atal-`
- Issue: `#13 — Block 4.1 — Universal Atal AI core`
- Base: `main`
- Base SHA: `243784ea47a2094d6b44bce5f165cfd53e2c76b6`
- Branch: `feature/atal-ai-core-block-4-1`
- Contract: `docs/atal-ai/block-4-1/`
- Draft PR: created from the branch after this documentation package is committed.

The worker must not create a competing issue, branch or PR unless the canonical branch/PR is irrecoverably unavailable and the directing ChatGPT explicitly authorizes replacement.

## 4. Mandatory startup sequence

Before modifying code:

```bash
git fetch origin
git checkout feature/atal-ai-core-block-4-1
git pull --ff-only origin feature/atal-ai-core-block-4-1
git status --short --branch
git rev-parse HEAD
git merge-base --is-ancestor 243784ea47a2094d6b44bce5f165cfd53e2c76b6 HEAD
```

Then read, in order:

```text
docs/atal-ai/block-4-1/README.md
docs/atal-ai/block-4-1/01-product-and-scope-contract.md
docs/atal-ai/block-4-1/02-core-architecture.md
docs/atal-ai/block-4-1/03-tools-risk-and-confirmation-matrix.md
docs/atal-ai/block-4-1/04-transactions-audit-and-undo.md
docs/atal-ai/block-4-1/05-implementation-plan.md
docs/atal-ai/block-4-1/06-test-and-acceptance-matrix.md
docs/atal-ai/block-4-1/07-autonomous-execution-protocol.md
```

Inspect the current implementations and tests at minimum:

```text
src/data/atalStore.ts
src/features/atal-ai/types.ts
src/features/atal-ai/AtalAIConversationScreen.tsx
src/features/atal-ai/data/commandRegistry.ts
src/features/atal-ai/data/applyDraft.ts
src/features/atal-ai/data/aiRepository.ts
src/features/atal-ai/api/geminiClient.ts
tests/*.test.mjs
package.json
tsconfig.json
```

Post a startup comment to the draft PR containing:

- branch and HEAD;
- base ancestor confirmation;
- clean/dirty status;
- baseline test count/result;
- concise restatement of non-negotiable protections;
- planned first checkpoint.

Do not modify code until baseline commands pass or a genuine pre-existing failure is documented.

## 5. Worktree and environment isolation

Use a clean clone/worktree dedicated to this branch. Do not reuse a worktree with unrelated changes.

For npm, prefer a clean isolated environment when the default cache is unreliable:

```bash
rm -rf node_modules /tmp/atal-npm-cache /tmp/atal-npm-home
mkdir -p /tmp/atal-npm-cache /tmp/atal-npm-home
: > /tmp/atal-user.npmrc
: > /tmp/atal-global.npmrc
HOME=/tmp/atal-npm-home \
NPM_CONFIG_CACHE=/tmp/atal-npm-cache \
NPM_CONFIG_USERCONFIG=/tmp/atal-user.npmrc \
NPM_CONFIG_GLOBALCONFIG=/tmp/atal-global.npmrc \
npm ci --cache=/tmp/atal-npm-cache
```

Do not commit `node_modules`, `.tmp`, generated build output, local secrets or validation screenshots unless the repository already has an approved evidence location.

## 6. Execution mode

Use `superpowers:subagent-driven-development` when available. Otherwise use `superpowers:executing-plans`.

Rules:

- one implementation task at a time;
- write failing behavioral test first;
- run the focused test and record expected failure;
- implement the smallest coherent solution;
- run focused test, full tests and typecheck;
- review diff for scope/bypass;
- commit with one focused message;
- push after each green task;
- post checkpoint evidence after each checkpoint, not after every tiny test step.

Parallel work is allowed only for independent read-only inspection or documentation. Do not let multiple workers edit the same files concurrently.

## 7. Commit protocol

Expected commit sequence, adjusted only when a reviewer-worthy task boundary requires it:

1. `test: add Block 4.1 quality safety net`
2. `feat: define typed Atal AI core contracts`
3. `feat: add Atal AI registry and risk policy`
4. `feat: resolve Atal AI entities deterministically`
5. `feat: add atomic Atal AI transactions and undo`
6. `feat: register Atal AI query and command tools`
7. `refactor: route Atal AI drafts through core tools`
8. `refactor: connect Atal AI conversation to universal core`
9. targeted `fix:` commits only for defects found during regression
10. `docs: record Block 4.1 validation evidence` only when documentation files actually change

Never use `--no-verify`, force push or amend a pushed commit. Add a new corrective commit.

## 8. Checkpoint evidence

Post one structured PR comment for each checkpoint.

### Template

```markdown
## Checkpoint 4.1X — <name>

- HEAD: `<sha>`
- Scope completed: <exact deliverables>
- Files changed: <paths>
- Focused tests: <command and count>
- Full tests: <count passed/failed>
- Typecheck: PASS/FAIL
- Build: PASS/FAIL or not required at this checkpoint
- CI: <status/link when available>
- Store key/version changed: NO
- Secrets/external integrations added: NO
- Known issues: <none or exact issue>
- Next checkpoint: <4.1Y>
```

Also update issue #13 checklist through comments when direct checklist editing is unavailable. The issue remains the milestone summary; the PR contains technical evidence.

## 9. Autonomous correction authority

The worker may correct without asking the user when all are true:

- the defect was introduced in the current branch;
- the correction remains inside this contract;
- no store version/key/migration changes;
- no new dependency unless already specified;
- no product/visual redesign;
- no new external behavior;
- tests demonstrate the defect and correction;
- correction is committed separately.

Examples allowed:

- type error from new contract;
- failing new resolver edge case;
- rollback bug introduced by transaction engine;
- compatibility adapter regression;
- CI configuration mistake;
- small accessibility issue in a newly added confirmation state.

## 10. Mandatory stop conditions

Stop implementation, preserve evidence and comment on PR/issue when any occurs:

1. the working branch is not the canonical branch;
2. base SHA is not an ancestor;
3. tracked changes exist before work and cannot be attributed;
4. baseline fails before product changes after one clean environmental retry;
5. implementing the contract appears to require changing `ATAL_STORE_KEY` or version;
6. existing persisted data cannot be preserved deterministically;
7. a required behavior contradicts another canonical document;
8. a destructive clinical behavior is not explicitly specified;
9. an external service, secret or backend is required;
10. the proposed solution needs a broad unrelated refactor;
11. a new dependency is required and there is a viable no-dependency path conflict that needs architectural review;
12. tests reveal a pre-existing product defect outside Block 4.1;
13. Git history diverges or push would require force;
14. environment prevents clean verification after the documented isolation retry.

The stop comment must include exact command, error, affected SHA and whether any tracked files changed. Do not ask the user to diagnose technical details.

## 11. Prohibited behavior

- no direct work on `main`;
- no merge, ready-for-review transition or branch deletion;
- no force push;
- no bypass of failing tests;
- no removal/weakening of existing tests to achieve green status;
- no unrequested package updates;
- no hidden/manual store edits to make QA pass;
- no simulated Gemini success when no model response exists;
- no claims of visual PASS from code inspection;
- no secrets in code, logs, comments or screenshots;
- no full patient/record payload in PR comments;
- no final approval by the implementation worker.

## 12. Progress reporting

Each checkpoint comment includes:

- overall Block 4.1 percentage;
- current checkpoint;
- completed;
- pending;
- problems;
- blockers;
- next action.

Recommended progress allocation:

- 4.1A baseline/CI: 10%
- 4.1B contracts/registry/policy: 25%
- 4.1C entity resolution: 40%
- 4.1D risk/confirmation integrated: 50%
- 4.1E transactions/audit/undo: 70%
- 4.1F legacy tools and UI integration: 90%
- 4.1G full validation/evidence: 100% implementation complete, awaiting independent approval

Percent is evidence-based, not elapsed-time based.

## 13. Final worker handoff

When implementation is complete, the worker posts one final PR comment:

```markdown
# Block 4.1 implementation handoff

## Git
- Branch:
- Final SHA:
- Base SHA:
- Working tree:
- Commits:

## Architecture
- Core modules:
- Legacy mappings:
- Direct-mutation bypass search:

## Quality
- npm ci:
- Typecheck:
- Tests total/passed/failed:
- Build:
- CI:
- Bundle size/delta:

## Safety evidence
- Ambiguity:
- Confirmation fingerprint:
- Version conflict:
- Atomic rollback:
- Invariants:
- Audit:
- Undo/stale undo:
- Store key/version:

## Functional evidence
- Manual non-AI regressions:
- Atal AI query:
- Draft/apply:
- Sensitive action:
- Undo:
- Visual/console/network:

## Known limitations

## Conclusion
`IMPLEMENTATION COMPLETE — AWAITING INDEPENDENT VALIDATION`
```

The directing ChatGPT can retrieve this directly; the user does not need to copy it between chats.

## 14. Minimal startup prompt for the construction chat

Use this prompt only after the canonical draft PR exists:

```text
Act as the official construction worker for Atal Block 4.1.

Repository: jbskood-cyber/Atal-
Issue: #13
Branch: feature/atal-ai-core-block-4-1
Base SHA: 243784ea47a2094d6b44bce5f165cfd53e2c76b6
Canonical contract: docs/atal-ai/block-4-1/

Read every canonical document in the required order before changing code. Inspect the current implementation and tests. Confirm Git state and run the baseline. Execute docs/atal-ai/block-4-1/05-implementation-plan.md task-by-task using TDD and focused commits. Push each green task to the existing branch and post checkpoint evidence directly to the existing draft PR and issue #13. Fix defects introduced by your work autonomously when they remain inside the contract.

Do not work on main, change atal:store:v2/version, add external integrations/secrets, redesign the product, weaken tests, force-push, mark the PR ready or merge. Stop only for the mandatory conditions in 07-autonomous-execution-protocol.md.

Finish by leaving the PR in draft and publishing the final implementation handoff there. Do not depend on the user to relay routine reports.
```

## 15. Completion boundary

The construction session is finished when code, tests, CI and evidence are complete on the draft PR. Block 4.1 itself is not closed until independent validation passes and the user explicitly authorizes merge.
