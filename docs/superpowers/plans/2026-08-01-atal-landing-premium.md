# Atal Premium Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate a premium, mobile-first public landing at `/landing` without importing or initializing Atal's private clinical runtime.

**Architecture:** Keep the existing private application unchanged and introduce a minimal entry resolver in `src/main.tsx` that dynamically imports either a public landing entry or the existing private entry. The landing is a static, code-native React surface with synthetic view models, scoped styles, lazy below-fold sections and no dependency on `atal:store:v2`, Action Core, Gemini or private repositories. The first implementation remains at `/landing`; `/` and all private deep routes preserve current behavior.

**Tech Stack:** React 19, TypeScript 5.9, Vite 6, React Router 7, Tailwind 4 utilities where already appropriate, scoped CSS for the landing, Motion only for purposeful transitions, Lucide React for matching interface icons, Node test runner, Playwright Chromium.

## Global Constraints

- Do not modify `main`, PR #20, PR #22, Action Core, Atal IA behavior or `atal:store:v2`.
- Do not force push, auto-merge, merge, deploy or mark the implementation PR ready for review.
- Keep PR #23 as the approved design/specification PR.
- Implement on a separate branch based on the latest approved spec head after verifying it still contains no product code.
- Build and validate at `/landing`; do not move the landing to `/` without explicit product-owner approval of final browser captures.
- Narrative order: `Paciente → expediente → plan → ejercicios → sesión → reporte`.
- Predominantly Blue Clinical on cold near-white; one Graphite Clinical Atal IA section.
- No purple-blue gradients, multicolor AI glow, generic SaaS card grids, nested cards, stock doctor imagery, invented testimonials, customer logos, metrics, ratings, savings, recovery outcomes or scarcity.
- CTA labels are exactly `Ver Atal en acción` and `Conocer Atal IA`.
- Ati appears as a small badge beside `Atal IA` and in at most one additional supporting position. If the official asset is unavailable, render no substitute character and keep a layout-stable `AtiSlot` contract.
- Respect `prefers-reduced-motion`; no continuous decorative motion, bounce or elastic easing.
- WCAG 2.2 AA contrast, semantic landmarks, one `h1`, skip link, keyboard-operable menu, focus restoration and practical 44×44 CSS px touch targets.
- Required viewports: 360×800, 390×844, 768×1024, 1280×800 and 1440×900; additionally prove no horizontal overflow at 320 px.
- Public entry must not import or initialize `bootstrapRealWorkspace`, private store modules, private repositories, Action Core, Gemini runtime, `AtalPersistentShell` or private preference hydration.
- Public route-specific compressed JavaScript target: under 170 KB excluding explicitly justified shared React/runtime chunks.
- LCP target under 2.5 seconds on a representative mid-tier mobile profile, CLS under 0.1 and local navigation/menu INP under 200 ms.
- Synthetic demonstration data only; no copied patient names or local/private data.

---

## File Structure

### Entry and isolation

- Modify `src/main.tsx` — remove eager private imports and delegate to the entry resolver.
- Create `src/entry/renderApplication.tsx` — resolve `/landing` and dynamically import the correct entry.
- Create `src/private/PrivateAppEntry.tsx` — own existing private CSS imports, `bootstrapRealWorkspace()` and `<App />` render.
- Create `src/landing/LandingEntry.tsx` — own landing-only CSS and render `<LandingPage />`.

### Landing surface

- Create `src/landing/LandingPage.tsx` — page composition only.
- Create `src/landing/content.ts` — approved visible copy and typed static view models.
- Create `src/landing/analytics.ts` — no-op typed analytics adapter.
- Create `src/landing/components/LandingNav.tsx` — desktop anchors and accessible mobile sheet.
- Create `src/landing/components/HeroProductScene.tsx` — synthetic, code-native product evidence.
- Create `src/landing/components/FragmentedWorkIntro.tsx` — brief human problem framing.
- Create `src/landing/components/WorkflowNarrative.tsx` — connected six-step workflow.
- Create `src/landing/components/AgentEvidence.tsx` — Graphite Atal IA section and reviewable action state.
- Create `src/landing/components/AtiSlot.tsx` — official-asset contract with hidden fallback.
- Create `src/landing/components/MobileProductEvidence.tsx` — mobile-in-clinic evidence.
- Create `src/landing/components/TrustLedger.tsx` — verified product properties without testimonials.
- Create `src/landing/components/LandingFooter.tsx` — only real anchors/routes.
- Create `src/landing/landing.css` — scoped public design system and responsive behavior.

### Tests and evidence

- Create `tests/landing-entry-boundary.test.mjs` — deterministic source/import boundary checks.
- Create `tests/landing-content-contract.test.mjs` — prohibited claims and required copy checks.
- Create `e2e/landing-premium.spec.mjs` — route, CTA, keyboard, responsive, reduced-motion and isolation assertions.
- Create `scripts/landing/audit-public-bundle.mjs` — inspect Vite manifest/chunks for forbidden private modules and public-route budget.
- Create `docs/qa/atal-landing-fidelity-ledger.md` — viewport-by-viewport comparison and accepted deviations.

---

### Task 1: Freeze the Approved Contract and Create the Implementation Branch

**Files:**
- Read: `docs/superpowers/specs/2026-07-28-atal-landing-premium-design.md`
- Read: `docs/superpowers/specs/2026-08-01-atal-landing-owner-approval-addendum.md`
- Read: `docs/superpowers/plans/2026-08-01-atal-landing-premium.md`

**Interfaces:**
- Consumes: PR #23 head after the owner-approval addendum and this plan.
- Produces: branch `feature/atal-landing-premium-implementation` and a recorded base SHA.

- [ ] **Step 1: Verify governance state**

Run:

```bash
git fetch origin
git status --short --branch
git rev-parse origin/feature/atal-landing-premium-design
gh pr view 23 --json state,isDraft,mergedAt,headRefName,headRefOid,baseRefName
```

Expected: PR #23 is open, draft and unmerged; head branch is `feature/atal-landing-premium-design`; working tree is clean.

- [ ] **Step 2: Verify the spec branch contains documentation only relative to its stacked base**

Run:

```bash
git diff --name-only origin/feature/atal-final-polish-agent-qa...origin/feature/atal-landing-premium-design
```

Expected: only files under `docs/superpowers/specs/` and `docs/superpowers/plans/`.

- [ ] **Step 3: Create an isolated worktree and branch**

Run:

```bash
git worktree add ../atal-landing -b feature/atal-landing-premium-implementation origin/feature/atal-landing-premium-design
cd ../atal-landing
git rev-parse HEAD
git status --short --branch
```

Expected: clean branch with HEAD equal to the verified spec head.

- [ ] **Step 4: Record the base SHA in the draft PR notes**

Create `docs/qa/atal-landing-fidelity-ledger.md` with:

```markdown
# Atal Landing Fidelity Ledger

- Implementation base: `<verified SHA>`
- Public preview route: `/landing`
- Root migration: not authorized
- Official Ati production asset: `available` or `blocked — asset not found in persistent sources`

## Comparison log

No browser captures yet.
```

- [ ] **Step 5: Commit**

```bash
git add docs/qa/atal-landing-fidelity-ledger.md
git commit -m "docs: initialize landing implementation evidence"
```

---

### Task 2: Prove the Current Public-Route Isolation Failure

**Files:**
- Create: `tests/landing-entry-boundary.test.mjs`
- Read: `src/main.tsx`

**Interfaces:**
- Consumes: current eager imports in `src/main.tsx`.
- Produces: failing deterministic tests defining `resolveEntryKind(pathname)` and forbidden eager-import rules.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('main entry does not eagerly import the private workspace', () => {
  const source = read('src/main.tsx');
  assert.doesNotMatch(source, /workspaceBootstrap/);
  assert.doesNotMatch(source, /from ['"]\.\/App['"]/);
  assert.match(source, /renderApplication/);
});

test('entry resolver sends only the exact landing path to the public bundle', async () => {
  const { resolveEntryKind } = await import('../.tmp/core-tests/src/entry/renderApplication.js');
  assert.equal(resolveEntryKind('/landing'), 'landing');
  assert.equal(resolveEntryKind('/landing/'), 'landing');
  assert.equal(resolveEntryKind('/'), 'private');
  assert.equal(resolveEntryKind('/patients'), 'private');
  assert.equal(resolveEntryKind('/assistant'), 'private');
});

test('landing source tree has no private runtime imports', () => {
  const forbidden = [
    'atalStore',
    'workspaceBootstrap',
    'ActionCore',
    '@google/genai',
    'AtalPersistentShell',
    '/data/repositories',
  ];
  const files = fs.readdirSync(new URL('../src/landing', import.meta.url), { recursive: true })
    .filter((name) => /\.(ts|tsx)$/.test(String(name)));
  for (const name of files) {
    const source = read(`src/landing/${name}`);
    for (const token of forbidden) assert.doesNotMatch(source, new RegExp(token), `${name} imports ${token}`);
  }
});
```

- [ ] **Step 2: Extend the core test compiler include**

Modify `tests/tsconfig.core.json` to include:

```json
"../src/entry/**/*.ts",
"../src/entry/**/*.tsx"
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
npm ci
npm run test:core:compile
node --test tests/landing-entry-boundary.test.mjs
```

Expected: FAIL because `src/main.tsx` eagerly imports `./App` and `workspaceBootstrap`, and the resolver does not exist.

- [ ] **Step 4: Commit the RED test**

```bash
git add tests/landing-entry-boundary.test.mjs tests/tsconfig.core.json
git commit -m "test: define landing entry isolation"
```

---

### Task 3: Split Public and Private Entrypoints

**Files:**
- Modify: `src/main.tsx`
- Create: `src/entry/renderApplication.tsx`
- Create: `src/private/PrivateAppEntry.tsx`
- Create: `src/landing/LandingEntry.tsx`
- Create: `src/landing/LandingPage.tsx`
- Create: `src/landing/landing.css`
- Test: `tests/landing-entry-boundary.test.mjs`

**Interfaces:**
- Produces: `resolveEntryKind(pathname: string): 'landing' | 'private'` and `renderApplication(): Promise<void>`.
- `LandingEntry` and `PrivateAppEntry` each export `render(root: HTMLElement): void`.

- [ ] **Step 1: Implement the entry resolver**

```tsx
export type EntryKind = 'landing' | 'private';

export function resolveEntryKind(pathname: string): EntryKind {
  return /^\/landing\/?$/.test(pathname) ? 'landing' : 'private';
}

export async function renderApplication(): Promise<void> {
  const root = document.getElementById('root');
  if (!root) throw new Error('ROOT_ELEMENT_MISSING');
  const entry = resolveEntryKind(window.location.pathname) === 'landing'
    ? await import('../landing/LandingEntry')
    : await import('../private/PrivateAppEntry');
  entry.render(root);
}
```

- [ ] **Step 2: Reduce `src/main.tsx` to the resolver**

```tsx
import { renderApplication } from './entry/renderApplication';

void renderApplication();
```

- [ ] **Step 3: Move the current private initialization unchanged**

`src/private/PrivateAppEntry.tsx` must import the existing font and private stylesheet list from the previous `src/main.tsx`, import `App`, call `bootstrapRealWorkspace()` exactly once and register the service worker only for the private application.

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '../App';
import { bootstrapRealWorkspace } from '../data/workspaceBootstrap';
// Preserve the existing font and private CSS imports verbatim here.

export function render(root: HTMLElement): void {
  bootstrapRealWorkspace();
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
  }
}
```

- [ ] **Step 4: Add the minimal public entry**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import './landing.css';
import { LandingPage } from './LandingPage';

export function render(root: HTMLElement): void {
  ReactDOM.createRoot(root).render(<React.StrictMode><LandingPage /></React.StrictMode>);
}
```

Use a temporary semantic page in `LandingPage.tsx`:

```tsx
export function LandingPage() {
  return <main id="main-content"><h1>Atal</h1></main>;
}
```

- [ ] **Step 5: Run the isolation test GREEN**

```bash
npm run test:core:compile
node --test tests/landing-entry-boundary.test.mjs
npm run typecheck
npm run build
```

Expected: all PASS; Vite emits separate landing and private dynamic chunks.

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx src/entry src/private src/landing tests/tsconfig.core.json
git commit -m "feat: isolate public landing entry"
```

---

### Task 4: Lock the Copy and Claim Contract

**Files:**
- Create: `src/landing/content.ts`
- Create: `tests/landing-content-contract.test.mjs`

**Interfaces:**
- Produces: `landingCopy`, `workflowSteps`, `agentExamples`, `trustEvidence` as readonly typed values.

- [ ] **Step 1: Write the failing content-contract test**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/landing/content.ts', import.meta.url), 'utf8');

const prohibited = [
  /empieza gratis/i,
  /revolucionari/i,
  /diagnostica autom[aá]ticamente/i,
  /garantiza/i,
  /%/,
  /testimonio/i,
  /precio/i,
];

test('landing copy contains approved CTA labels', () => {
  assert.match(source, /Ver Atal en acción/);
  assert.match(source, /Conocer Atal IA/);
});

test('landing copy contains the complete workflow in order', () => {
  const labels = ['Paciente', 'Expediente', 'Plan', 'Ejercicios', 'Sesión', 'Reporte'];
  let cursor = -1;
  for (const label of labels) {
    const next = source.indexOf(`label: '${label}'`);
    assert.ok(next > cursor, `${label} is missing or out of order`);
    cursor = next;
  }
});

test('landing copy avoids unsupported commercial or clinical claims', () => {
  for (const pattern of prohibited) assert.doesNotMatch(source, pattern);
});
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/landing-content-contract.test.mjs
```

Expected: FAIL because `content.ts` does not exist.

- [ ] **Step 3: Implement typed content**

Define:

```ts
export interface WorkflowStep {
  id: 'patient' | 'record' | 'plan' | 'exercise' | 'session' | 'report';
  label: string;
  title: string;
  description: string;
}

export const landingCopy = {
  nav: { product: 'Producto', workflow: 'Cómo funciona', agent: 'Atal IA' },
  hero: {
    title: 'Del expediente al seguimiento, sin perder el hilo del paciente.',
    body: 'Atal conecta pacientes, planes, ejercicios, sesiones y reportes en una experiencia móvil. Atal IA te ayuda a consultar y aplicar cambios que siempre puedes revisar.',
    primaryCta: 'Ver Atal en acción',
    secondaryCta: 'Conocer Atal IA',
    trust: 'Diseñado para el trabajo diario del fisioterapeuta.',
  },
  fragmented: {
    title: 'Cuando la información vive en lugares distintos, el seguimiento pierde continuidad.',
    body: 'Notas, mensajes y documentos pueden acompañar el trabajo clínico sin convertirse en otro sistema que el fisioterapeuta deba reconstruir cada día.',
  },
  final: {
    title: 'Menos sistemas separados. Más continuidad clínica.',
    professionalJudgment: 'Atal ayuda a organizar y ejecutar el trabajo operativo. El criterio clínico permanece en manos del profesional.',
  },
} as const;
```

Add the six approved workflow steps, the three grounded Atal IA examples and only the six verifiable trust properties from the spec.

- [ ] **Step 4: Run GREEN**

```bash
node --test tests/landing-content-contract.test.mjs
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/landing/content.ts tests/landing-content-contract.test.mjs
git commit -m "feat: lock landing content contract"
```

---

### Task 5: Build the Semantic Page Skeleton and Working Anchors

**Files:**
- Modify: `src/landing/LandingPage.tsx`
- Create: `src/landing/components/LandingNav.tsx`
- Create: `src/landing/components/LandingFooter.tsx`
- Create: `src/landing/analytics.ts`
- Modify: `src/landing/landing.css`
- Create: `e2e/landing-premium.spec.mjs`

**Interfaces:**
- Produces anchor IDs `#product`, `#workflow`, `#atal-ai`, `#trust` and `#final-cta`.
- Produces no-op `trackLandingEvent(event: LandingEvent): void`.

- [ ] **Step 1: Write failing Playwright tests for semantics and CTA targets**

```js
import { expect, test } from '@playwright/test';

test.describe('Atal premium landing', () => {
  test('renders at /landing without the private shell', async ({ page }) => {
    await page.goto('/landing');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('[data-testid="atal-private-shell"]')).toHaveCount(0);
    await expect(page.locator('main#main-content')).toBeVisible();
  });

  test('approved CTAs navigate to real sections', async ({ page }) => {
    await page.goto('/landing');
    await page.getByRole('link', { name: 'Ver Atal en acción' }).first().click();
    await expect(page.locator('#workflow')).toBeInViewport();
    await page.getByRole('link', { name: 'Conocer Atal IA' }).first().click();
    await expect(page.locator('#atal-ai')).toBeInViewport();
  });
});
```

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium
```

Expected: FAIL because navigation and sections do not exist.

- [ ] **Step 3: Implement semantic composition**

`LandingPage.tsx` must render:

```tsx
<a className="landing-skip-link" href="#main-content">Saltar al contenido</a>
<LandingNav />
<main id="main-content">
  <section id="product" aria-labelledby="landing-hero-title">...</section>
  <section id="fragmented-work" aria-labelledby="fragmented-title">...</section>
  <section id="workflow" aria-labelledby="workflow-title">...</section>
  <section id="atal-ai" aria-labelledby="atal-ai-title">...</section>
  <section id="mobile" aria-labelledby="mobile-title">...</section>
  <section id="trust" aria-labelledby="trust-title">...</section>
  <section id="final-cta" aria-labelledby="final-cta-title">...</section>
</main>
<LandingFooter />
```

Do not add registration, pricing, contact, legal or private-app links.

- [ ] **Step 4: Implement no-op analytics**

```ts
export type LandingEvent =
  | 'landing_view'
  | 'workflow_section_view'
  | 'atal_ai_section_view'
  | 'primary_cta_click';

export function trackLandingEvent(_event: LandingEvent): void {}
```

- [ ] **Step 5: Implement accessible navigation**

Mobile menu requirements:

- real `<button aria-expanded aria-controls="landing-mobile-menu">`;
- Escape closes;
- first menu link receives focus on open;
- trigger receives focus on close;
- body scroll remains usable after closing;
- every target is a same-page anchor.

- [ ] **Step 6: Run GREEN**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium
npm run quality
```

- [ ] **Step 7: Commit**

```bash
git add src/landing e2e/landing-premium.spec.mjs
git commit -m "feat: add landing structure and navigation"
```

---

### Task 6: Create and Approve the Visual Direction Set

**Files:**
- Create: `docs/qa/landing-concepts/README.md`
- Update: `docs/qa/atal-landing-fidelity-ledger.md`

**Interfaces:**
- Produces: accepted visual references for hero, workflow, Graphite Atal IA, mobile evidence and final CTA.

- [ ] **Step 1: Inventory the visible copy and allowed component families**

Record in `docs/qa/landing-concepts/README.md`:

- exact nav and CTA strings from `content.ts`;
- section order;
- Blue Clinical palette and one Graphite section;
- allowed families: open editorial sections, one connected workflow rail, one product scene frame, one evidence ledger, buttons, anchor navigation and Ati badge;
- prohibited families: pricing, testimonials, bento grids, generic feature-card grids, dashboard chrome, carousels and decorative pills.

- [ ] **Step 2: Produce coordinated visual concepts before styling the full page**

Create one readable reference for each:

1. hero + first preview of fragmented-work section;
2. connected workflow narrative;
3. Graphite Atal IA section with `Aplicar cambios`, compact receipt and Ati badge slot;
4. mobile-in-clinic and trust ledger;
5. final CTA/footer;
6. 390×844 mobile composition.

If Image Gen is unavailable in the execution environment, stop visual implementation at this gate, record `BLOCKED_TOOLING_IMAGE_CONCEPT` in the fidelity ledger and do not invent a substitute visual direction.

- [ ] **Step 3: Review concept fidelity**

Reject concepts containing any prohibited pattern, unsupported claim, illegible product UI, warm beige/cream backgrounds or repeated Ati appearances.

- [ ] **Step 4: Obtain product-owner approval of the concept set**

Record exact approved files/URLs and approval date in the fidelity ledger. Do not proceed to Tasks 7–11 without this approval.

- [ ] **Step 5: Commit the concept inventory and ledger**

```bash
git add docs/qa/landing-concepts docs/qa/atal-landing-fidelity-ledger.md
git commit -m "docs: record landing visual direction gate"
```

---

### Task 7: Implement the Blue Clinical Hero and Human Introduction

**Files:**
- Create: `src/landing/components/HeroProductScene.tsx`
- Create: `src/landing/components/FragmentedWorkIntro.tsx`
- Modify: `src/landing/LandingPage.tsx`
- Modify: `src/landing/landing.css`
- Modify: `e2e/landing-premium.spec.mjs`

**Interfaces:**
- `HeroProductScene` consumes no private data and renders static synthetic props.
- `FragmentedWorkIntro` renders exactly three sources: `Notas`, `Mensajes`, `Documentos`, converging into `Atal`.

- [ ] **Step 1: Add failing viewport and content assertions**

Assert at 390×844 and 1280×800:

- hero `h1`, body and both CTAs are visible without horizontal scrolling;
- the product scene is code-native and has an accessible description;
- no browser-device collage or third-party stock image is present;
- the next section is partially visible at desktop without crowding the hero;
- fragmented-work source labels are exactly `Notas`, `Mensajes`, `Documentos`.

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium --grep "hero|fragmented"
```

- [ ] **Step 3: Implement from the approved concept**

Use semantic HTML and static synthetic content. Product scene must represent a patient summary, active plan and one compact reviewable Atal IA change without importing private components or data.

- [ ] **Step 4: Apply exact visual tokens from the approved concept**

Define scoped custom properties under `.atal-landing` for background, surface, graphite text, clinical blue, border, radii, spacing and motion. Do not alter global private styles.

- [ ] **Step 5: Verify and commit**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium --grep "hero|fragmented"
npm run typecheck
git add src/landing e2e/landing-premium.spec.mjs
git commit -m "feat: build landing hero and problem framing"
```

---

### Task 8: Implement the Connected Workflow Narrative

**Files:**
- Create: `src/landing/components/WorkflowNarrative.tsx`
- Modify: `src/landing/LandingPage.tsx`
- Modify: `src/landing/landing.css`
- Modify: `e2e/landing-premium.spec.mjs`

**Interfaces:**
- Consumes `workflowSteps` from `content.ts`.
- Produces one ordered semantic list and one optional sticky product viewport at widths ≥768 px.

- [ ] **Step 1: Add failing tests**

Assert:

- six ordered steps with the approved labels;
- a readable text sequence exists when motion is reduced;
- no six-card grid;
- sticky behavior is disabled below 768 px;
- every step remains visible and legible at 320 px.

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium --grep "workflow"
```

- [ ] **Step 3: Implement the connected rail**

Use `<ol>` and progressive enhancement. The visual progress indicator is `aria-hidden`; the ordered text remains the source of meaning.

- [ ] **Step 4: Add purposeful motion only**

Use opacity/translate transitions triggered by viewport intersection. Under `prefers-reduced-motion: reduce`, remove transitions and sticky choreography while preserving content order.

- [ ] **Step 5: Verify and commit**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium --grep "workflow"
npm run typecheck
git add src/landing e2e/landing-premium.spec.mjs
git commit -m "feat: add connected clinical workflow narrative"
```

---

### Task 9: Implement the Graphite Atal IA Evidence and Ati Contract

**Files:**
- Create: `src/landing/components/AgentEvidence.tsx`
- Create: `src/landing/components/AtiSlot.tsx`
- Modify: `src/landing/LandingPage.tsx`
- Modify: `src/landing/landing.css`
- Modify: `e2e/landing-premium.spec.mjs`

**Interfaces:**
- `AtiSlot({ placement: 'agent' | 'final', assetSrc?: string })` renders the official asset only when `assetSrc` is non-empty; otherwise returns `null` without leaving a visible placeholder.
- `AgentEvidence` consumes the three approved `agentExamples` and renders `Aplicar cambios`, `Cambios aplicados` and `Deshacer` as static product evidence, not functional mutations.

- [ ] **Step 1: Add failing tests**

Assert:

- section background resolves to Graphite Clinical, not a gradient;
- exactly one visible `Atal IA` badge location in this section;
- no raw JSON, percentage, draft tab or diagnostic claim;
- `AtiSlot` renders no substitute when the asset is missing;
- `prefers-reduced-motion` removes nonessential transitions.

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium --grep "Atal IA|Ati"
```

- [ ] **Step 3: Implement `AtiSlot`**

```tsx
interface AtiSlotProps {
  placement: 'agent' | 'final';
  assetSrc?: string;
}

export function AtiSlot({ placement, assetSrc }: AtiSlotProps) {
  if (!assetSrc) return null;
  return <img className={`ati-slot ati-slot--${placement}`} src={assetSrc} alt="Ati, guía visual de Atal IA" width="40" height="40" />;
}
```

Use explicit dimensions to avoid CLS. Do not create another mascot asset.

- [ ] **Step 4: Implement the agent evidence**

Represent the workflow:

`natural prompt → compact prepared change → Aplicar cambios → compact receipt → Deshacer`

Keep it static and truthful. It must not import Action Core or execute mutations.

- [ ] **Step 5: Verify and commit**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium --grep "Atal IA|Ati"
npm run typecheck
git add src/landing e2e/landing-premium.spec.mjs
git commit -m "feat: show reviewable Atal IA evidence"
```

---

### Task 10: Implement Mobile Evidence, Trust Ledger and Final CTA

**Files:**
- Create: `src/landing/components/MobileProductEvidence.tsx`
- Create: `src/landing/components/TrustLedger.tsx`
- Modify: `src/landing/LandingPage.tsx`
- Modify: `src/landing/LandingFooter.tsx`
- Modify: `src/landing/landing.css`
- Modify: `e2e/landing-premium.spec.mjs`

**Interfaces:**
- `TrustLedger` consumes only verified `trustEvidence` strings.
- Final CTA may render a second `AtiSlot` only when the official asset is present and the approved concept includes it.

- [ ] **Step 1: Add failing tests**

Assert:

- mobile evidence shows compact navigation, guided-session input and keyboard-safe composition without a decorative phone frame;
- trust ledger contains only six verified product properties;
- final CTA uses approved headline and primary CTA;
- footer has no empty legal, contact, social, login or pricing links.

- [ ] **Step 2: Run RED**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium --grep "mobile|trust|footer"
```

- [ ] **Step 3: Implement approved components**

Keep the evidence compact, code-native and synthetic. Use lists/ledger rows rather than oversized cards.

- [ ] **Step 4: Verify and commit**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium --grep "mobile|trust|footer"
npm run typecheck
git add src/landing e2e/landing-premium.spec.mjs
git commit -m "feat: complete landing evidence and final CTA"
```

---

### Task 11: Prove Responsive, Keyboard and Reduced-Motion Behavior

**Files:**
- Modify: `e2e/landing-premium.spec.mjs`
- Modify: `src/landing/landing.css`

**Interfaces:**
- Produces deterministic viewport and accessibility evidence.

- [ ] **Step 1: Add the required viewport matrix**

```js
const viewports = [
  { name: 'android-compact', width: 360, height: 800 },
  { name: 'mobile-common', width: 390, height: 844 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'overflow-floor', width: 320, height: 800 },
];

for (const viewport of viewports) {
  test(`${viewport.name} has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/landing');
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}
```

- [ ] **Step 2: Add keyboard tests**

Verify skip link, menu open/close, focus restoration, Escape, tab order and every CTA target.

- [ ] **Step 3: Add reduced-motion test**

```js
test.use({ reducedMotion: 'reduce' });
test('reduced motion preserves the complete story', async ({ page }) => {
  await page.goto('/landing');
  await expect(page.locator('#workflow li')).toHaveCount(6);
  await expect(page.locator('#atal-ai')).toBeVisible();
});
```

- [ ] **Step 4: Run and fix until GREEN**

```bash
npx playwright test e2e/landing-premium.spec.mjs --project=chromium
```

- [ ] **Step 5: Commit**

```bash
git add src/landing/landing.css e2e/landing-premium.spec.mjs
git commit -m "test: harden landing responsive accessibility"
```

---

### Task 12: Audit the Public Bundle and Private Regression Surface

**Files:**
- Create: `scripts/landing/audit-public-bundle.mjs`
- Modify: `package.json`
- Modify: `tests/landing-entry-boundary.test.mjs`

**Interfaces:**
- Produces command `npm run audit:landing-bundle`.

- [ ] **Step 1: Enable a Vite manifest**

Modify `vite.config.ts` build settings without changing existing plugins:

```ts
build: {
  manifest: true,
}
```

If a `build` block already exists, merge `manifest: true` into it.

- [ ] **Step 2: Implement bundle audit**

The script must:

1. read `dist/.vite/manifest.json`;
2. identify the landing dynamic entry and recursively collect its imports;
3. fail if any collected source path or emitted chunk contains `workspaceBootstrap`, `atalStore`, `ActionCore`, `@google/genai`, `AtalPersistentShell`, `guided-session`, `patient`, `plan` or `exercise` private-screen modules;
4. gzip landing-specific JavaScript chunks and fail above 170 KB, while printing shared-runtime size separately;
5. print a deterministic PASS summary with chunk names and compressed bytes.

Add:

```json
"audit:landing-bundle": "npm run build && node scripts/landing/audit-public-bundle.mjs"
```

- [ ] **Step 3: Run the full deterministic suite**

```bash
npm run quality
npm run audit:landing-bundle
npx playwright test e2e/landing-premium.spec.mjs --project=chromium
```

Expected: all PASS. Existing private routes `/`, `/patients`, `/plans`, `/exercises`, `/assistant` and their existing E2E suite remain green.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts package.json scripts/landing tests/landing-entry-boundary.test.mjs
git commit -m "test: audit landing bundle isolation"
```

---

### Task 13: Browser Fidelity, Accessibility and Performance Review

**Files:**
- Update: `docs/qa/atal-landing-fidelity-ledger.md`
- Create: `docs/qa/landing-captures/README.md`

**Interfaces:**
- Produces final review evidence; does not authorize root migration or merge.

- [ ] **Step 1: Capture stable browser states**

For each required viewport capture:

- hero;
- workflow midpoint;
- Atal IA section;
- final CTA/footer;
- mobile menu open;
- reduced-motion mode.

Record branch SHA and browser version. Do not include private patient data.

- [ ] **Step 2: Complete the fidelity ledger**

For every section compare at least:

1. visible copy and CTA labels;
2. layout/section order;
3. typography hierarchy;
4. palette and Graphite section treatment;
5. product-scene and Ati asset treatment;
6. spacing/container model;
7. responsive collapse;
8. motion/reduced motion.

Each row must contain concept evidence, rendered evidence and the fix made or explicit accepted deviation.

- [ ] **Step 3: Run accessibility checks**

Record:

- WCAG 2.2 AA automated results;
- keyboard walkthrough;
- focus visibility;
- 200% zoom;
- no color-only meaning;
- image alt text;
- 44×44 touch targets.

- [ ] **Step 4: Record measured performance**

Run Lighthouse or equivalent at 390×844 with a mid-tier mobile profile. Record LCP, CLS and interaction responsiveness. Do not infer results from source code.

- [ ] **Step 5: Run all existing belts**

```bash
npm run quality
npm run audit:ai-capabilities
git diff --exit-code
npx playwright test --project=chromium
npm run audit:landing-bundle
```

The capability report command must leave no uncommitted diff.

- [ ] **Step 6: Commit QA evidence**

```bash
git add docs/qa
git commit -m "docs: record landing visual and performance QA"
```

---

### Task 14: Publish a Separate Draft Implementation PR

**Files:**
- No product file changes.

**Interfaces:**
- Produces a draft PR stacked on `feature/atal-landing-premium-design`.

- [ ] **Step 1: Verify final state**

```bash
git status --short
git log --oneline --decorate -12
npm run quality
npm run audit:landing-bundle
npx playwright test --project=chromium
```

Expected: clean working tree and all checks green.

- [ ] **Step 2: Push without force**

```bash
git push -u origin feature/atal-landing-premium-implementation
```

- [ ] **Step 3: Open a draft PR**

```bash
gh pr create \
  --draft \
  --base feature/atal-landing-premium-design \
  --head feature/atal-landing-premium-implementation \
  --title "feat: build Atal premium landing preview" \
  --body-file /tmp/atal-landing-pr.md
```

PR body must state:

- implementation base SHA;
- `/landing` preview only;
- `/` migration not authorized;
- public/private bundle isolation evidence;
- required viewport results;
- accessibility and performance measurements;
- official Ati asset status;
- quality/Behavior/E2E results;
- PR #20 and PR #22 untouched;
- no deploy, merge or ready transition authorized;
- exact owner-review captures.

- [ ] **Step 4: Verify PR governance**

```bash
gh pr view --json number,state,isDraft,baseRefName,headRefName,headRefOid,mergeable
```

Expected: open, draft, unmerged, base `feature/atal-landing-premium-design`.

- [ ] **Step 5: Update the operational sheet only for this substantial checkpoint**

Record branch, SHA, draft PR, deterministic belts, viewport matrix, bundle isolation, Ati asset status and the next required action: product-owner visual review.

---

## Plan Self-Review

### Spec coverage

- Public `/landing` preview and unchanged `/`: Tasks 2–5 and 14.
- Public/private runtime isolation: Tasks 2, 3 and 12.
- Approved product-led narrative and copy: Tasks 4, 7–10.
- Human fragmented-work introduction: Task 7.
- Blue Clinical plus one Graphite section: Tasks 7 and 9.
- Ati approved badge/optional second placement with no substitute: Tasks 6, 9 and 10.
- Exact CTA model and no invented destinations: Tasks 4, 5 and 10.
- Mobile-first, accessibility, reduced motion and required viewports: Tasks 7–11 and 13.
- Performance, bundle and no-CLS evidence: Tasks 9, 12 and 13.
- Browser/Playwright and final owner capture review: Tasks 11–14.
- Existing quality, Behavior and E2E protections: Tasks 3, 12, 13 and 14.
- No merge/deploy/root migration: Global constraints and Task 14.

### Placeholder scan

No `TBD`, `TODO`, “implement later” or unspecified test steps remain. The official Ati asset is an explicit binary state with a tested null fallback and a documented final-acceptance blocker.

### Type consistency

- `resolveEntryKind(pathname)` consistently returns `'landing' | 'private'`.
- Both entry modules consistently export `render(root: HTMLElement): void`.
- `AtiSlot` consistently accepts `placement: 'agent' | 'final'` and optional `assetSrc`.
- Analytics events and anchor IDs are defined once and reused by tests.

## Execution Decision

The product owner requested autonomous execution. Use **inline execution with `superpowers:executing-plans`** in task order, stopping at Task 6 if coordinated visual concepts cannot be generated or have not been approved. Do not skip the visual gate merely because route isolation and semantic structure can be implemented deterministically.
