# Atal Premium Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate a premium, mobile-first Atal landing at `/landing` without initializing private clinical state, changing `/`, or altering the protected Behavior System.

**Architecture:** Add a public route boundary above the current private application, defer all workspace bootstrap and private imports until a private route is selected, and lazy-load the landing as a static public surface. The landing uses public-only components, synthetic product evidence, scoped styles and a hidden-by-default `AtiSlot` until the approved official asset is committed.

**Tech Stack:** React 19, React Router 7, TypeScript 5.9, Vite 6, Tailwind 4 utilities, scoped CSS, Motion with reduced-motion support, Playwright/browser QA, existing Node quality suite.

## Global Constraints

- Do not modify `main`, PR #20, PR #22, Action Core, Atal IA behavior, `atal:store:v2` schemas or Gemini runtime.
- Keep PR #23 open/draft as the approved specification; implementation lives in `feature/atal-landing-premium-implementation` and a separate draft PR only after real code exists.
- First public preview route is `/landing`; `/` remains the current private home until explicit owner approval after visual QA.
- Narrative order is Paciente → Expediente → Plan → Ejercicios → Sesión → Reporte.
- Visual base is Blue Clinical on true/cold white with one Graphite section for Atal IA; no purple-blue gradient, generic SaaS card grid, nested cards, stock-doctor imagery, invented proof, pricing or fake lead capture.
- Primary CTA text is `Ver Atal en acción`; secondary CTA text is `Conocer Atal IA`.
- Ati appears only as the approved small badge beside `Atal IA` and at most one second subtle location. No substitute mascot may be generated.
- Public route must not initialize `bootstrapRealWorkspace`, `ThemeProvider`, `useAtalStore`, patient repositories, AI hooks, IndexedDB or private service-worker state.
- Required viewports: 360×800, 390×844, 768×1024, 1280×800 and 1440×900, plus 320 px overflow verification.
- Accessibility target: WCAG 2.2 AA, 44×44 practical touch targets, semantic landmarks, one `h1`, skip link, keyboard menu, focus return and reduced-motion parity.
- Performance targets: route-specific public JS under 170 KB compressed where measurable, LCP under 2.5 s on representative mid-tier mobile, CLS under 0.1 and no eager private app/AI imports.

---

## File Map

### Entry and route isolation
- Modify `src/main.tsx`: render a route-aware root only; remove unconditional workspace bootstrap.
- Modify `src/App.tsx`: export the new root composition.
- Create `src/routing/AtalRoot.tsx`: choose public vs private lazy boundary.
- Create `src/routing/PrivateAppEntry.tsx`: bootstrap workspace once, import private styles/providers and render `AppCloseout`.
- Modify `src/AppCloseout.tsx`: remain the private app router; do not own `/landing`.

### Landing surface
- Create `src/landing/LandingPage.tsx`: semantic page composition and anchor IDs.
- Create `src/landing/landing.css`: isolated design tokens, responsive layout and reduced-motion rules.
- Create `src/landing/content.ts`: immutable Spanish copy and synthetic evidence data.
- Create `src/landing/components/LandingNav.tsx`
- Create `src/landing/components/HeroProductScene.tsx`
- Create `src/landing/components/FragmentationIntro.tsx`
- Create `src/landing/components/WorkflowNarrative.tsx`
- Create `src/landing/components/AgentEvidence.tsx`
- Create `src/landing/components/MobileProductEvidence.tsx`
- Create `src/landing/components/TrustLedger.tsx`
- Create `src/landing/components/AtiSlot.tsx`
- Create `src/landing/components/LandingFooter.tsx`
- Create `src/landing/analytics.ts`: no-op adapter only.

### Tests and evidence
- Create `tests/landing-route-isolation.test.mjs`: source-level import and bootstrap boundary assertions.
- Create `e2e/landing-premium.spec.mjs`: public routing, CTA, keyboard, overflow, reduced motion and private-route regression.
- Create `docs/atal-landing/visual-baseline.md`: approved viewports, capture SHA and fidelity ledger.
- Create `docs/atal-landing/product-evidence-manifest.md`: synthetic scene provenance and capability mapping.

---

### Task 1: Establish a route-safe public/private entry boundary

**Files:**
- Create: `src/routing/AtalRoot.tsx`
- Create: `src/routing/PrivateAppEntry.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Test: `tests/landing-route-isolation.test.mjs`

**Interfaces:**
- Produces: `AtalRoot(): JSX.Element`, `PrivateAppEntry(): JSX.Element`.
- `PrivateAppEntry` is the only module allowed to import `bootstrapRealWorkspace` and private global styles.
- `/landing` lazy-imports `LandingPage`; every other path lazy-imports `PrivateAppEntry`.

- [ ] **Step 1: Write the failing isolation test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('main does not bootstrap the private workspace unconditionally', async () => {
  const source = await read('src/main.tsx');
  assert.doesNotMatch(source, /bootstrapRealWorkspace/);
});

test('public root lazily separates landing from private application', async () => {
  const source = await read('src/routing/AtalRoot.tsx');
  assert.match(source, /lazy\(\(\) => import\('\.\.\/landing\/LandingPage'\)\)/);
  assert.match(source, /lazy\(\(\) => import\('\.\/PrivateAppEntry'\)\)/);
  assert.match(source, /path="\/landing"/);
});

test('private entry owns workspace bootstrap', async () => {
  const source = await read('src/routing/PrivateAppEntry.tsx');
  assert.match(source, /bootstrapRealWorkspace\(\)/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:core:compile && node --test tests/landing-route-isolation.test.mjs`

Expected: FAIL because the routing files do not exist and `main.tsx` still imports `bootstrapRealWorkspace`.

- [ ] **Step 3: Implement the minimal route boundary**

`src/routing/AtalRoot.tsx`:

```tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const LandingPage = lazy(() => import('../landing/LandingPage'));
const PrivateAppEntry = lazy(() => import('./PrivateAppEntry'));

export function AtalRoot() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="atal-root-loading" aria-label="Cargando Atal" />}>
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="*" element={<PrivateAppEntry />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

`src/routing/PrivateAppEntry.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { AppCloseout } from '../AppCloseout';
import { bootstrapRealWorkspace } from '../data/workspaceBootstrap';

export default function PrivateAppEntry() {
  const bootstrapped = useRef(false);
  if (!bootstrapped.current) {
    bootstrapRealWorkspace();
    bootstrapped.current = true;
  }
  useEffect(() => {
    document.documentElement.dataset.atalSurface = 'private';
    return () => { delete document.documentElement.dataset.atalSurface; };
  }, []);
  return <AppCloseout />;
}
```

Move private-only stylesheet imports from `src/main.tsx` into `src/routing/PrivateAppEntry.tsx`. Keep only font loading and a minimal neutral root stylesheet in `main.tsx`. Update `src/App.tsx` to `export { AtalRoot as App } from './routing/AtalRoot';`.

- [ ] **Step 4: Run focused test and quality**

Run: `node --test tests/landing-route-isolation.test.mjs && npm run typecheck && npm run build`

Expected: PASS; `/` behavior remains routed through `AppCloseout`.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/App.tsx src/routing tests/landing-route-isolation.test.mjs
git commit -m "feat: isolate public landing from private Atal runtime"
```

### Task 2: Add the static content contract and landing shell

**Files:**
- Create: `src/landing/content.ts`
- Create: `src/landing/LandingPage.tsx`
- Create: `src/landing/landing.css`
- Create: `src/landing/analytics.ts`
- Test: `tests/landing-route-isolation.test.mjs`

**Interfaces:**
- Produces `landingCopy`, `workflowSteps`, `agentExamples`, `trustEvidence` as readonly data.
- Produces `trackLandingEvent(event: LandingEvent): void`; implementation is no-op.

- [ ] **Step 1: Extend the failing source-contract test**

Assert exact CTA strings, six workflow IDs, one `h1`, no pricing/waitlist copy, no private-store imports and a no-op analytics export.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/landing-route-isolation.test.mjs`

Expected: FAIL because landing modules do not exist.

- [ ] **Step 3: Implement immutable content and semantic shell**

Use exact visible copy:

```ts
export const landingCopy = {
  heroTitle: 'Del expediente al seguimiento, sin perder el hilo del paciente.',
  heroBody: 'Atal conecta pacientes, planes, ejercicios, sesiones y reportes en una experiencia móvil. Atal IA te ayuda a consultar y aplicar cambios que siempre puedes revisar.',
  primaryCta: 'Ver Atal en acción',
  secondaryCta: 'Conocer Atal IA',
  agentTitle: 'Pídeselo como lo dirías en la clínica.',
  finalTitle: 'Menos sistemas separados. Más continuidad clínica.',
} as const;
```

`LandingPage` contains skip link, `<header>`, `<main id="contenido">`, one `h1`, sections `fragmentacion`, `flujo`, `atal-ia`, `movil`, `confianza`, `final`, and `<footer>`. It imports only landing modules and `landing.css`.

- [ ] **Step 4: Run tests and build**

Run: `node --test tests/landing-route-isolation.test.mjs && npm run quality`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/landing tests/landing-route-isolation.test.mjs
git commit -m "feat: add semantic Atal landing shell"
```

### Task 3: Build navigation, hero and human-fragmentation opening

**Files:**
- Create: `src/landing/components/LandingNav.tsx`
- Create: `src/landing/components/HeroProductScene.tsx`
- Create: `src/landing/components/FragmentationIntro.tsx`
- Modify: `src/landing/LandingPage.tsx`
- Modify: `src/landing/landing.css`
- Test: `e2e/landing-premium.spec.mjs`

**Interfaces:**
- `LandingNav` receives no private state; mobile menu owns local boolean state and restores focus to its trigger.
- `HeroProductScene` renders synthetic product evidence only.

- [ ] **Step 1: Write failing Playwright tests**

Cover `/landing`, exact nav/CTA labels, `#flujo` and `#atal-ia` anchor movement, keyboard open/close of mobile navigation, Escape close and focus return.

- [ ] **Step 2: Run focused E2E and verify RED**

Run: `npx playwright test e2e/landing-premium.spec.mjs --project=chromium --grep "navigation|hero"`

Expected: FAIL because components are absent.

- [ ] **Step 3: Implement the first viewport**

Create a true-white/cold-white hero with editorial spacing, Blue Clinical action, no eyebrow pill, one legible product composition and a short fragmentation transition showing `Notas`, `Mensajes`, `Documentos`, `Seguimiento` converging into `Atal`. Do not use testimonials, percentages, logos, decorative device chrome or stock photography.

- [ ] **Step 4: Verify 360×800, 390×844 and 1280×800**

Run the focused E2E and capture screenshots. Confirm next-section preview remains visible, CTA labels do not wrap awkwardly and no horizontal overflow exists.

- [ ] **Step 5: Commit**

```bash
git add src/landing/components src/landing/LandingPage.tsx src/landing/landing.css e2e/landing-premium.spec.mjs
git commit -m "feat: build Atal landing hero and navigation"
```

### Task 4: Implement the connected clinical workflow narrative

**Files:**
- Create: `src/landing/components/WorkflowNarrative.tsx`
- Modify: `src/landing/content.ts`
- Modify: `src/landing/LandingPage.tsx`
- Modify: `src/landing/landing.css`
- Test: `e2e/landing-premium.spec.mjs`

**Interfaces:**
- `WorkflowNarrative` consumes six readonly `WorkflowStep` entries.
- Desktop may use sticky evidence; widths below 768 px use a linear document flow with all text visible.

- [ ] **Step 1: Add failing E2E assertions**

Assert ordered visible labels `Paciente`, `Expediente`, `Plan`, `Ejercicios`, `Sesión`, `Reporte`; reduced-motion mode must expose the complete sequence without animation dependency.

- [ ] **Step 2: Verify RED**

Run the workflow-focused Playwright test.

- [ ] **Step 3: Implement the connected rail**

Use one continuous rail/chapter sequence, not six independent cards. Product evidence must use synthetic patient data and map each claim to a current implemented capability.

- [ ] **Step 4: Run E2E at 320, 768 and 1440 widths**

Expected: no horizontal page scrolling; sticky behavior disabled when viewport height is constrained; reading order remains semantic.

- [ ] **Step 5: Commit**

```bash
git add src/landing e2e/landing-premium.spec.mjs
git commit -m "feat: tell the connected Atal clinical workflow"
```

### Task 5: Build the Graphite Atal IA evidence section and Ati contract

**Files:**
- Create: `src/landing/components/AgentEvidence.tsx`
- Create: `src/landing/components/AtiSlot.tsx`
- Modify: `src/landing/content.ts`
- Modify: `src/landing/LandingPage.tsx`
- Modify: `src/landing/landing.css`
- Test: `e2e/landing-premium.spec.mjs`

**Interfaces:**
- `AtiSlot({ placement, assetSrc? })` renders nothing when `assetSrc` is absent.
- `AgentEvidence` renders the approved small badge placement only when the official asset exists.

- [ ] **Step 1: Write failing tests**

Assert three exact natural-language examples, `Aplicar cambios`, `Cambios aplicados`, `Deshacer`, no raw JSON/tool names, and no visible Ati placeholder when no official asset is configured.

- [ ] **Step 2: Verify RED**

Run the Atal IA-focused E2E.

- [ ] **Step 3: Implement Graphite section**

Use one dark Graphite band, restrained opacity/translation motion, a compact Atal IA name row and reviewable mutation receipt. Do not imply diagnosis or autonomous clinical judgment.

- [ ] **Step 4: Verify contrast and reduced motion**

Check WCAG AA contrast, keyboard reading order and complete static presentation under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Commit**

```bash
git add src/landing e2e/landing-premium.spec.mjs
git commit -m "feat: add reviewable Atal IA landing evidence"
```

### Task 6: Add mobile evidence, trust ledger, final CTA and footer

**Files:**
- Create: `src/landing/components/MobileProductEvidence.tsx`
- Create: `src/landing/components/TrustLedger.tsx`
- Create: `src/landing/components/LandingFooter.tsx`
- Modify: `src/landing/LandingPage.tsx`
- Modify: `src/landing/landing.css`
- Test: `e2e/landing-premium.spec.mjs`

**Interfaces:**
- Trust entries are verifiable properties only.
- Footer omits terms/contact/login links until destinations exist.

- [ ] **Step 1: Write failing content and CTA tests**

Assert mobile section copy, trust statements, final CTA anchor target and absence of dead links.

- [ ] **Step 2: Verify RED**

Run focused E2E.

- [ ] **Step 3: Implement remaining sections**

Show thumb reach, compact density, guided session and keyboard-safe composition through synthetic static scenes. Trust uses an evidence ledger rather than oversized cards.

- [ ] **Step 4: Run complete browser matrix**

Run 360×800, 390×844, 768×1024, 1280×800 and 1440×900, plus 320 px overflow.

- [ ] **Step 5: Commit**

```bash
git add src/landing e2e/landing-premium.spec.mjs
git commit -m "feat: complete Atal landing narrative"
```

### Task 7: Prove private-state isolation, bundle boundaries and regressions

**Files:**
- Modify: `tests/landing-route-isolation.test.mjs`
- Modify: `e2e/landing-premium.spec.mjs`
- Create: `scripts/landing/check-public-bundle.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces `npm run audit:landing-bundle`.
- Fails if the landing initial chunk contains known private runtime module names or exceeds the recorded budget without an explicit reviewed exception.

- [ ] **Step 1: Write failing audit**

Parse Vite manifest/output and reject initial `/landing` dependency paths containing `atalStore`, `workspaceBootstrap`, `gemini`, `ActionCore`, patient repositories or guided-session runtime.

- [ ] **Step 2: Verify RED against current bundle**

Run: `npm run build && npm run audit:landing-bundle`

Expected: FAIL until route splitting and manifest inspection are wired correctly.

- [ ] **Step 3: Complete lazy-boundary fixes**

Move remaining eager private imports/styles behind `PrivateAppEntry`. Do not duplicate React/Router or introduce a second framework.

- [ ] **Step 4: Run all deterministic belts**

Run: `npm run quality && npm run audit:landing-bundle && npx playwright test e2e/landing-premium.spec.mjs`

Expected: all PASS; existing deep private routes still load and `/` remains unchanged.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/landing tests e2e
git commit -m "test: certify Atal landing isolation and routing"
```

### Task 8: Visual, accessibility and performance closeout

**Files:**
- Create: `docs/atal-landing/visual-baseline.md`
- Create: `docs/atal-landing/product-evidence-manifest.md`
- Modify: landing files only for findings.

**Interfaces:**
- Visual baseline records branch SHA, viewport, section, reduced-motion state and accepted deviations.
- Evidence manifest maps every marketing claim to a real product behavior and synthetic scene source.

- [ ] **Step 1: Run first complete browser capture set**

Capture hero, workflow midpoint, Atal IA, final CTA/footer, mobile menu open and reduced-motion mode at required viewports.

- [ ] **Step 2: Run Impeccable review sequence**

Apply `shape`, `critique`, `distill`, `clarify`, `audit`, then `polish`. Record every finding and resolution; do not add new sections during polish.

- [ ] **Step 3: Run accessibility/performance evidence**

Measure contrast, keyboard flow, 200% zoom, touch targets, LCP, CLS, INP and route-specific compressed JS. Fix measured failures before documenting results.

- [ ] **Step 4: Write fidelity ledger and evidence manifest**

Include at least five comparisons: first-viewport composition, typography, palette, section rhythm, product evidence treatment, mobile collapse, motion and icons.

- [ ] **Step 5: Final deterministic verification**

Run: `npm run quality && npm run audit:landing-bundle && npx playwright test e2e/landing-premium.spec.mjs`

Expected: PASS with no skipped landing tests.

- [ ] **Step 6: Open a separate draft implementation PR**

Base it on `feature/atal-landing-premium-design`, keep it draft, document exact SHA and belts, and state explicitly: `/landing` only; no `/` migration, deploy, ready transition or merge authorized.

- [ ] **Step 7: Request owner visual review**

Provide stable mobile and desktop captures. Do not mark ready until Josue explicitly approves the final captures.

---

## Self-Review

- **Spec coverage:** Route isolation, narrative, Ati rules, mobile/desktop behavior, accessibility, performance, SEO-safe copy, privacy-safe analytics, product evidence and visual QA each map to an explicit task.
- **Protected surfaces:** No task changes Action Core, Atal IA behavior, `atal:store:v2`, PR #20, PR #22, `main`, deployment or root-route ownership.
- **Placeholder scan:** Conditional external capabilities are omitted rather than represented by dead UI. The official Ati asset is a declared asset dependency; the page remains complete without a substitute.
- **Type consistency:** `AtalRoot`, `PrivateAppEntry`, `LandingPage`, `AtiSlot`, `LandingEvent`, `WorkflowStep` and the bundle-audit script are defined before downstream use.
- **Acceptance boundary:** Completion means a reviewed `/landing` candidate with deterministic, visual, accessibility and performance evidence. It does not authorize moving the landing to `/`.
