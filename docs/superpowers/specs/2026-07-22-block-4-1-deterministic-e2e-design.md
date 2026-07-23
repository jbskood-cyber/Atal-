# Block 4.1 Deterministic E2E Validation Design

## Purpose

Replace the fragile attempt to automate Google AI Studio with a small, repeatable Playwright suite that tests Atal directly in GitHub Actions. The suite provides enough independent evidence to close checkpoint 4.1G without requiring the user's computer, an authenticated AI Studio iframe, or a real Gemini API key.

## Scope

The suite covers six critical behaviors:

1. the clinical pain field rejects invalid text and never persists `NaN`;
2. an Atal AI query reads data without mutating `atal:store:v2`;
3. a reversible Atal AI write requires review, applies atomically, records audit data and can be undone exactly;
4. a sensitive plan operation requires explicit confirmation and cancellation produces zero mutation;
5. duplicate normalized patient identity and stale drafts are blocked without partial writes;
6. a 390 px smoke test confirms persistence, light/Graphite theme rendering, essential routes and absence of fatal browser errors.

The full lower-level core matrix remains covered by the existing Node tests. This suite does not retest every permutation of plan state, every legacy adapter, or every mobile width.

## Architecture

- `playwright.config.mjs` starts the existing Vite development server through Playwright `webServer` and runs Chromium only.
- `e2e/fixtures.mjs` owns deterministic `atal:store:v2`, conversation and Gemini-response fixtures.
- `e2e/block-4-1-critical.spec.mjs` seeds browser storage before each test, intercepts only `/api/atal-ai/analyze`, and exercises the real React UI plus the real deterministic Atal AI core.
- `.github/workflows/e2e.yml` installs `@playwright/test` transiently with `--no-save --no-package-lock`, installs Chromium, runs the suite with one worker and uploads reports/traces/screenshots.

No runtime dependency, package-lock change, backend, deployment or secret is introduced.

## Data flow

Each test creates a new browser context. Before Atal loads, an init script writes a complete fictitious version-2 store and optional AI conversation/draft collections to localStorage. For AI scenarios, Playwright intercepts the browser request to `/api/atal-ai/analyze` and returns a typed fixture. The response then passes through the real schema normalizer, legacy adapter, registry, policy, transaction engine, invariant validation, audit and undo implementation.

The test reads `atal:store:v2` after each important step and compares exact data rather than relying only on visible text.

## Reliability rules

- Chromium only; one worker in CI.
- No coordinates, arbitrary long sleeps, `networkidle`, AI Studio iframe automation or real model calls.
- Semantic locators (`getByRole`, `getByLabel`, `getByText`) are preferred.
- One retry in CI, trace on first retry, screenshots only on failure and retained failure video.
- Browser console errors and uncaught page errors fail the representative smoke test.
- Every test is isolated and can run independently.

## Acceptance

The E2E workflow passes only when all critical scenarios pass. Reports and failure artifacts are uploaded even when a test fails. Existing `quality` CI must continue to pass. The PR remains draft and unmerged until the user authorizes integration.