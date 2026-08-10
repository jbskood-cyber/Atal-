# Atal Product-Native Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/landing` as a faithful public extension of the real Atal product using the app's canonical green/mint visual system, real product evidence and the official Ati asset.

**Architecture:** Preserve the existing public/private route boundary and lazy split. Replace only the public landing presentation with focused product-native sections whose visual scenes are assembled from static public-safe fixtures and shared static brand primitives, never from private stores or AI runtime code. Keep `/` and all private routes unchanged.

**Tech Stack:** React 19, TypeScript, Vite, React Router 7, CSS/Tailwind 4, Motion only where already available, Node tests, Playwright E2E.

## Global Constraints

- Keep implementation at `/landing`; do not move `/`.
- Do not touch FOCO, `main`, PR #20 or PR #22.
- Do not force push, auto-merge or deploy.
- Keep PR #23 and PR #24 draft.
- Use canonical tokens from `app/globals.css`: green `#16a36a`, green-dark `#0d7d51`, mint `#e8f5ef`, ink `#0f1416`, muted `#6c7771`, line `#e2e8e5`, surface `#ffffff`, canvas `#f7f9f8`.
- Use the owner-provided Ati source; do not generate or redraw another mascot.
- No testimonials, metrics, pricing, signup, contact or clinical claims without real support.
- Public code must not import `atal:store:v2`, Gemini runtime, Action Core or private repositories.
- Required QA: 320×800, 360×800, 390×844, 768×1024, 1280×800 and 1440×900; keyboard, mobile menu, anchors, reduced motion, WCAG 2.2 AA, route isolation, public bundle isolation and deep-route preservation.

---

### Task 1: Lock visual evidence and rejection guards

**Files:**
- Create: `docs/atal-landing/product-native-evidence-ledger.md`
- Modify: `tests/landing-route-isolation.test.mjs`
- Create or modify: `tests/landing-visual-contract.test.mjs`

**Interfaces:**
- Consumes: repository routes, component names and canonical token values.
- Produces: a checked evidence ledger and deterministic source-level guards used by later tasks.

- [ ] **Step 1: Write failing visual-contract tests**

Add assertions that public landing source contains the canonical green/mint tokens or CSS variables and does not contain the rejected blue/purple/navy palette, fake metrics, testimonial sections, pricing sections or unsupported CTA labels.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --test tests/landing-route-isolation.test.mjs tests/landing-visual-contract.test.mjs`

Expected: FAIL because the current landing still contains the rejected visual direction.

- [ ] **Step 3: Build the evidence ledger**

Record each planned scene with: source route/component, visible capability, fixture text, whether the scene is reconstructed or captured, and prohibited interpretations.

- [ ] **Step 4: Commit**

```bash
git add docs/atal-landing/product-native-evidence-ledger.md tests/landing-route-isolation.test.mjs tests/landing-visual-contract.test.mjs
git commit -m "test: lock product-native landing contract"
```

### Task 2: Add the official Ati asset safely

**Files:**
- Create: `src/landing/assets/ati-official.png` or an optimized equivalent derived from the supplied owner asset
- Create: `src/landing/components/AtiMark.tsx`
- Create: `src/landing/components/AtiMark.test.tsx` if the project test stack supports component tests; otherwise extend the source contract test

**Interfaces:**
- Produces: `AtiMark({ role: 'assistant' | 'closing', className?: string })`.

- [ ] **Step 1: Write a failing asset contract**

Assert that Ati is referenced only through `AtiMark`, appears no more than twice in landing source and has stable dimensions/aspect ratio.

- [ ] **Step 2: Verify the test fails**

Run the focused Node test.

- [ ] **Step 3: Derive and add the official asset**

Crop/optimize the supplied image while preserving the official mint material, face, proportions and four-loop silhouette. Do not regenerate it.

- [ ] **Step 4: Implement `AtiMark`**

Use explicit dimensions, `decoding="async"`, appropriate `loading` behavior and role-specific alt text.

- [ ] **Step 5: Run tests and commit**

```bash
git add src/landing/assets src/landing/components tests
git commit -m "feat: add official Ati landing asset"
```

### Task 3: Rebuild the public design primitives

**Files:**
- Create: `src/landing/product-native.css`
- Create or modify: `src/landing/components/LandingHeader.tsx`
- Create: `src/landing/components/ProductFrame.tsx`
- Create: `src/landing/components/ProductScene.tsx`

**Interfaces:**
- Produces: `ProductFrame`, `ProductScene` and a responsive public header.

- [ ] **Step 1: Write failing source and interaction tests**

Cover approved nav labels, CTA labels, mobile menu semantics, anchor targets and absence of private imports.

- [ ] **Step 2: Verify failure**

Run the focused tests.

- [ ] **Step 3: Implement canonical public tokens and primitives**

Use true white/cool canvas, app-matched radii, thin borders and restrained green-tinted shadows. Avoid card nesting and decorative pills.

- [ ] **Step 4: Implement header behavior**

Desktop header stays compact. Mobile menu traps no focus, closes with Escape and returns focus to its trigger.

- [ ] **Step 5: Run tests and commit**

```bash
git add src/landing tests
git commit -m "feat: establish product-native landing system"
```

### Task 4: Build the hero from faithful Atal product evidence

**Files:**
- Create: `src/landing/sections/ProductHero.tsx`
- Create: `src/landing/scenes/PatientWorkspaceScene.tsx`
- Modify: `src/landing/LandingPage.tsx`

**Interfaces:**
- `ProductHero` receives no private data and renders deterministic public-safe fixture content.

- [ ] **Step 1: Write failing hero tests**

Assert exact approved CTAs, concise human opening, no eyebrow pill, no fake metrics and one dominant faithful product scene.

- [ ] **Step 2: Verify failure**

Run focused tests.

- [ ] **Step 3: Implement the scene using real app anatomy**

Recreate recognizable Atal shell, patient context, plan/session evidence and native green/mint states. Do not invent analytics dashboards.

- [ ] **Step 4: Verify responsive composition at 320, 390 and 1280 widths**

Ensure the product scene remains legible and does not collapse into a miniature desktop screenshot.

- [ ] **Step 5: Commit**

```bash
git add src/landing tests
git commit -m "feat: rebuild landing hero around real Atal UI"
```

### Task 5: Build the connected patient-to-report narrative

**Files:**
- Create: `src/landing/sections/ConnectedWorkflow.tsx`
- Create: `src/landing/scenes/WorkflowScenes.tsx`
- Modify: `src/landing/product-native.css`

**Interfaces:**
- Produces a six-chapter semantic sequence with anchors and one active visual state.

- [ ] **Step 1: Write failing chapter-order and reduced-motion tests**

Assert exact order: Paciente, Expediente, Plan, Ejercicios, Sesión, Reporte. Assert all content remains visible with reduced motion.

- [ ] **Step 2: Verify failure**

Run focused tests.

- [ ] **Step 3: Implement desktop sticky narrative and mobile vertical fallback**

Use open editorial layout rather than six cards. Animate only active-scene transitions.

- [ ] **Step 4: Test keyboard and scroll behavior**

All chapter controls, if interactive, must be keyboard reachable and expose selected state.

- [ ] **Step 5: Commit**

```bash
git add src/landing tests
git commit -m "feat: add connected clinical workflow narrative"
```

### Task 6: Rebuild the Graphite Atal IA chapter

**Files:**
- Create: `src/landing/sections/AtalAiChapter.tsx`
- Create: `src/landing/scenes/AtalAiActionScene.tsx`
- Modify: `src/landing/product-native.css`

**Interfaces:**
- Consumes: `AtiMark` and deterministic public-safe action fixtures.

- [ ] **Step 1: Write failing trust-boundary tests**

Assert no AI runtime imports, no raw JSON, no unsupported clinical claims and one official Ati appearance.

- [ ] **Step 2: Verify failure**

Run focused tests.

- [ ] **Step 3: Implement the single Graphite section**

Show request → proposed change → confirmation → receipt/Undo using real visual language from Atal IA. Keep all other page sections light.

- [ ] **Step 4: Verify contrast and reduced motion**

Check WCAG AA for text and controls on Graphite.

- [ ] **Step 5: Commit**

```bash
git add src/landing tests
git commit -m "feat: rebuild Atal IA landing chapter"
```

### Task 7: Add mobile-in-clinic evidence and restrained close

**Files:**
- Create: `src/landing/sections/MobileClinicalEvidence.tsx`
- Create: `src/landing/sections/LandingClose.tsx`
- Modify: `src/landing/LandingPage.tsx`

**Interfaces:**
- Produces the final light sections and optional second Ati appearance.

- [ ] **Step 1: Write failing CTA, footer and asset-count tests**

Assert only approved CTAs, minimal footer, no fake links and total Ati usage <= 2.

- [ ] **Step 2: Implement readable mobile product evidence**

Use native-scale app surfaces without decorative multi-phone collage.

- [ ] **Step 3: Implement trust close**

Use verifiable properties only and repeat the approved CTA hierarchy.

- [ ] **Step 4: Run tests and commit**

```bash
git add src/landing tests
git commit -m "feat: complete product-native landing narrative"
```

### Task 8: Performance, route isolation and bundle audit

**Files:**
- Modify: `src/main.tsx` only if needed to preserve lazy boundaries
- Modify: `tests/landing-route-isolation.test.mjs`
- Modify: build-analysis test or script already used by the repository

**Interfaces:**
- Verifies that public route code remains independent from private runtime.

- [ ] **Step 1: Add failing bundle-boundary assertions where coverage is missing**

- [ ] **Step 2: Run typecheck, unit/source tests and build**

Run: `npm run typecheck && npm test && npm run build`

- [ ] **Step 3: Inspect public chunks**

Confirm no store, Gemini, Action Core or private repository symbols are present in the landing chunk.

- [ ] **Step 4: Verify deep private routes**

Run existing route E2E tests for `/`, patients, plans, exercises, sessions/reports and assistant routes.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "test: certify landing isolation and performance"
```

### Task 9: Full visual and accessibility QA

**Files:**
- Modify: `e2e/landing-premium.spec.mjs`
- Update: `docs/atal-landing/visual-baseline.md`
- Update: `docs/atal-landing/product-native-evidence-ledger.md`

**Interfaces:**
- Produces the final owner-review artifact set.

- [ ] **Step 1: Capture all six required viewports after waiting for the H1 and fonts**

- [ ] **Step 2: Verify 320px overflow, menu, anchors, keyboard, focus and reduced motion**

- [ ] **Step 3: Run automated accessibility checks and manually inspect contrast and reading order**

- [ ] **Step 4: Run Quality, Behavior and E2E on the same HEAD**

- [ ] **Step 5: Manually compare rendered captures against real Atal screens and the approved concept direction**

Reject the result if it looks like a generic SaaS page even when tests pass.

- [ ] **Step 6: Commit evidence**

```bash
git add e2e docs
git commit -m "test: add product-native landing review evidence"
```

### Task 10: Owner review handoff

**Files:**
- Update PR #24 body/comment and the operational sheet only after all QA is green.

- [ ] **Step 1: Confirm `/` is unchanged, PR #24 is draft and no deploy occurred**
- [ ] **Step 2: Package full-page captures and key detail crops**
- [ ] **Step 3: Notify `READY_FOR_REVIEW` with exact HEAD and CI run IDs**
- [ ] **Step 4: Wait for explicit owner visual approval before any root migration, ready transition, merge or deploy**
