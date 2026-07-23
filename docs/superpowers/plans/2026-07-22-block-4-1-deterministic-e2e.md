# Block 4.1 Deterministic E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small Playwright suite and GitHub Actions workflow that independently validate the critical Block 4.1 behaviors without Google AI Studio or a real Gemini key.

**Architecture:** Playwright starts the existing Vite app, seeds a complete fictitious `atal:store:v2` per test, and intercepts only the Gemini HTTP boundary. The real UI, schema normalization, registry, policy, transaction, audit and undo code remain under test. GitHub Actions installs Playwright transiently so package-lock stays unchanged.

**Tech Stack:** React 19, Vite 6, Node 24, Playwright Test 1.61.1, GitHub Actions.

## Global Constraints

- Work only on `feature/atal-ai-core-block-4-1`.
- Preserve `atal:store:v2` and store version `2`.
- Do not add runtime dependencies, secrets, deployments or external integrations.
- Do not modify `package-lock.json`.
- Use only fictitious clinical data.
- Keep PR #14 open, draft and unmerged.

---

### Task 1: Playwright runner and deterministic fixtures

**Files:**
- Create: `playwright.config.mjs`
- Create: `e2e/fixtures.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces `createState`, `createConversation`, `createDraftResponse`, `seedBrowser`, `mockAnalyze`, and `readStore` helpers for all E2E tests.

- [ ] Create Chromium-only configuration with `webServer.command = 'npm run dev'`, base URL `http://127.0.0.1:3000`, one CI worker, one CI retry, HTML/list reporters, trace on first retry, screenshot on failure and retained failure video.
- [ ] Add complete deterministic patient, record, two plans, exercise, session, settings and audit-safe private-contact fixtures.
- [ ] Add browser-storage helpers that seed `atal:store:v2`, `atal:ai-conversations:v1`, `atal:ai-drafts:v1`, and `atal:theme` before navigation.
- [ ] Add an HTTP interception helper for `**/api/atal-ai/analyze`.
- [ ] Ignore `playwright-report/`, `test-results/` and `.playwright/`.

### Task 2: Critical E2E scenarios

**Files:**
- Create: `e2e/block-4-1-critical.spec.mjs`

**Interfaces:**
- Consumes fixture helpers from Task 1.
- Produces six isolated browser tests.

- [ ] Add pain-field regression test: invalid text rejected, version unchanged, no `NaN`, decimal comma accepted, one version increment and persistence after reload.
- [ ] Add query test: summarized patient is visible and the exact clinical store remains unchanged.
- [ ] Add reversible-write test: note requires confirmation, zero pre-confirmation mutation, atomic success audit, undo and exact restoration.
- [ ] Add sensitive-write test: activation requires confirmation, cancel is zero mutation, confirm activates only the intended plan.
- [ ] Add ambiguity test: normalized duplicate patient proposal surfaces the existing-patient collision and cannot create a duplicate.
- [ ] Add stale-draft test: mutate the persisted target after proposal creation, reload, show conflict, disable Apply and preserve the newer state.
- [ ] Add 390 px smoke assertions for essential routes, theme persistence, horizontal overflow and fatal browser errors.

### Task 3: GitHub Actions execution and artifacts

**Files:**
- Create: `.github/workflows/e2e.yml`

**Interfaces:**
- Produces the required `e2e` status check and downloadable Playwright artifacts.

- [ ] Checkout and configure Node 24 with npm cache.
- [ ] Run `npm ci`.
- [ ] Install `@playwright/test@1.61.1` transiently using `npm install --no-save --no-package-lock`.
- [ ] Install Chromium and system dependencies with `npx playwright install --with-deps chromium`.
- [ ] Run `npx playwright test` with one worker.
- [ ] Upload `playwright-report/` and `test-results/` whenever the job is not cancelled.

### Task 4: Verification and evidence

**Files:**
- No product file changes expected.

- [ ] Confirm existing `quality` workflow passes.
- [ ] Confirm new `e2e` workflow passes or inspect exact artifacts and fix only reproducible test/product defects.
- [ ] Confirm `package-lock.json`, store key/version, PR draft state and merge state remain unchanged.
- [ ] Post exact test counts, workflow results, artifacts and any limitations to PR #14 and issue #13.