# Atal Clinical Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary scaffold with a faithful, responsive Atal clinical application that manages patients, exercise templates, and treatment plans with browser-local persistence in Google AI Studio.

**Architecture:** Keep the existing Next.js App Router project and build focused feature modules under `src/`. Domain types and a replaceable local repository own data mutations; React screens subscribe through `useSyncExternalStore` so UI components never access `localStorage` directly. Shared Atal primitives and a responsive shell reproduce the approved mobile and desktop mockups without introducing external infrastructure.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS 4, Lucide React, Vitest, Testing Library, Playwright.

## Global Constraints

- Work directly on `main`; keep it runnable at every checkpoint.
- Google AI Studio preview is the only delivery surface in this block.
- Do not add Netlify, login, Supabase, Gemini, Mercado Pago, Stripe, Resend, webhooks, or production credentials.
- Mockups M001–M079 outrank implementation preferences for visible layout and responsive behavior.
- D003 owns product behavior; D004 owns technical boundaries except infrastructure deferred by the approved design.
- Use custom Atal components; do not add a general-purpose visual component library.
- UI components must not read or write `localStorage` directly.
- Verify mobile at 430×764 CSS px and desktop at 1440×810 CSS px.

---

### Task 1: Stabilize tooling and establish the Atal test harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/smoke.test.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Delete: `src/components/layout/Footer.tsx`
- Delete: `src/components/layout/Header.tsx`
- Delete: `src/components/ui/Badge.tsx`
- Delete: `src/components/ui/Card.tsx`

**Interfaces:**
- Produces scripts `test`, `test:watch`, and `test:e2e`.
- Produces a jsdom test environment with Testing Library matchers.

- [ ] **Step 1: Add the test dependencies and scripts**

Run:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react playwright
```

Update `package.json` scripts to include:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 2: Write the failing scaffold smoke test**

Create `src/test/smoke.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

test('renders the Atal product instead of the temporary scaffold', () => {
  render(<Home />);
  expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument();
  expect(screen.queryByText('Repositorio inicial listo')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run the test and verify the expected failure**

Run: `npm test -- src/test/smoke.test.tsx`

Expected: FAIL because the current page does not render the `Inicio` heading.

- [ ] **Step 4: Configure Vitest and the root metadata**

Create `vitest.config.ts` with the React plugin, `jsdom`, `@` alias, and `src/test/setup.ts`. Load `@testing-library/jest-dom/vitest` in setup. Set the root layout language to `es-MX`, title to `Atal Fisioterapia`, description to `Gestión clínica para fisioterapeutas`, and add viewport/theme metadata.

- [ ] **Step 5: Replace the temporary global CSS with Atal tokens**

Define exact CSS variables for `--atal-green: #00a66a`, `--atal-green-dark: #08724d`, `--atal-mint: #eaf7f1`, `--atal-bg: #f6f8f7`, `--atal-surface: #ffffff`, `--atal-text: #14211c`, `--atal-muted: #62716a`, `--atal-border: #dce5e1`, and dark equivalents. Add base focus, selection, scrollbar, safe-area, and reduced-motion rules.

- [ ] **Step 6: Keep the smoke test red until Task 4**

Run: `npm run typecheck`

Expected: PASS. The product smoke test remains intentionally red because Task 4 supplies Home.

- [ ] **Step 7: Commit the harness checkpoint**

```bash
git add package.json package-lock.json vitest.config.ts src/test app/layout.tsx app/globals.css src/components
git commit -m "test: establish Atal frontend harness"
```

### Task 2: Build domain contracts and replaceable local persistence

**Files:**
- Create: `src/domain/clinical.ts`
- Create: `src/data/demo-data.ts`
- Create: `src/data/clinical-repository.ts`
- Create: `src/data/local-clinical-repository.ts`
- Create: `src/data/local-clinical-repository.test.ts`
- Create: `src/state/clinical-store.ts`
- Create: `src/state/use-clinical-store.ts`

**Interfaces:**
- Produces `Patient`, `ExerciseTemplate`, `TreatmentPlan`, `PlanExercise`, `ClinicalSnapshot`, `PatientInput`, `ExerciseInput`, and `PlanInput`.
- Produces `ClinicalRepository` with `getSnapshot`, `subscribe`, `createPatient`, `updatePatient`, `archivePatient`, `restorePatient`, `createExerciseTemplate`, `updateExerciseTemplate`, `createPlan`, `updatePlan`, `activatePlan`, and `resetDemoData`.
- Produces `clinicalStore` and `useClinicalStore(selector)`.

- [ ] **Step 1: Write failing repository behavior tests**

Cover these behaviors with isolated in-memory storage:

```ts
test('creates a patient and persists it across repository instances', () => {});
test('archives and restores a patient without losing clinical data', () => {});
test('copies exercise prescription values into a plan', () => {});
test('activating a plan deactivates the patient previous active plan', () => {});
test('reset restores deterministic demo data', () => {});
```

- [ ] **Step 2: Run tests and verify they fail because contracts are missing**

Run: `npm test -- src/data/local-clinical-repository.test.ts`

Expected: FAIL on unresolved imports.

- [ ] **Step 3: Implement focused domain types and deterministic seeds**

Use stable string identifiers, ISO date strings, explicit status unions, and mockup-aligned Spanish seed content. Seed at least 12 patients, 10 exercises, and 6 plans so M004, M005, M007, M008, M012, and M076 can render at the intended density.

- [ ] **Step 4: Implement the repository and subscription store**

Use a versioned storage envelope:

```ts
type PersistedClinicalData = {
  version: 1;
  snapshot: ClinicalSnapshot;
};
```

Every mutation must clone only affected collections, persist once, emit once, and return the created or updated entity. Guard browser-only storage access for server rendering.

- [ ] **Step 5: Run repository tests and verify green**

Run: `npm test -- src/data/local-clinical-repository.test.ts`

Expected: 5 tests PASS.

- [ ] **Step 6: Commit the data checkpoint**

```bash
git add src/domain src/data src/state
git commit -m "feat: add local clinical data contracts"
```

### Task 3: Implement the Atal design system and responsive application shell

**Files:**
- Create: `src/components/brand/AtalMark.tsx`
- Create: `src/components/brand/AtalLogo.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/IconButton.tsx`
- Create: `src/components/ui/StatusDot.tsx`
- Create: `src/components/ui/Avatar.tsx`
- Create: `src/components/ui/SearchField.tsx`
- Create: `src/components/ui/SegmentedControl.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/Skeleton.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/MobileHeader.tsx`
- Create: `src/components/layout/MobileNavigation.tsx`
- Create: `src/components/layout/DesktopSidebar.tsx`
- Create: `src/components/layout/SecondaryMenu.tsx`
- Create: `src/components/layout/PageHeader.tsx`
- Create: `src/components/layout/AppShell.test.tsx`

**Interfaces:**
- `AppShell({ children, title?, backHref?, actions? })` owns responsive chrome.
- `MobileNavigation` and `DesktopSidebar` use pathname-derived active states.
- All primitives accept `className` without embedding domain data.

- [ ] **Step 1: Write failing shell tests**

Verify the Atal logo, primary destinations, active route, secondary menu toggle, and dedicated IA launcher are present.

- [ ] **Step 2: Run shell tests and verify missing-component failures**

Run: `npm test -- src/components/layout/AppShell.test.tsx`

Expected: FAIL on unresolved `AppShell`.

- [ ] **Step 3: Implement brand and primitives from M003/M004**

Create the four-loop mark as an accessible SVG using `currentColor`. Use 44px minimum touch targets, 2px focus rings, restrained shadows, 1px borders, and no gradients or invented decorative badges.

- [ ] **Step 4: Implement mobile and desktop shells**

Mobile uses the floating bottom navigation and separate assistant launcher. Desktop switches at 1024px to a fixed 236px sidebar with content area. Secondary navigation replaces the primary destinations in an accessible sheet-like panel.

- [ ] **Step 5: Run tests and verify green**

Run: `npm test -- src/components/layout/AppShell.test.tsx`

Expected: all shell tests PASS.

- [ ] **Step 6: Commit the shell checkpoint**

```bash
git add src/components
git commit -m "feat: build Atal responsive application shell"
```

### Task 4: Replace the scaffold with the functional Inicio dashboard

**Files:**
- Modify: `app/page.tsx`
- Create: `src/features/home/HomeScreen.tsx`
- Create: `src/features/home/HomeScreen.test.tsx`
- Create: `src/features/home/HomeMetrics.tsx`
- Create: `src/features/home/TodayPatients.tsx`
- Create: `src/features/home/DailyTasks.tsx`

**Interfaces:**
- `HomeScreen` derives counts and rows from `useClinicalStore`.
- Patient rows link to `/patients/:patientId`; plan and alert actions link to their domain routes.

- [ ] **Step 1: Write failing Home behavior tests**

Verify the heading, three metrics, four recent patients, daily tasks, and navigation links rendered from seed data.

- [ ] **Step 2: Run Home and scaffold smoke tests to verify red**

Run: `npm test -- src/features/home/HomeScreen.test.tsx src/test/smoke.test.tsx`

Expected: FAIL because Home is not implemented.

- [ ] **Step 3: Implement M004 mobile composition and M076 desktop density**

Preserve open white space, metric dividers, dense borderless lists, green/orange/gray status dots, and fixed navigation. Do not convert list rows into generic cards.

- [ ] **Step 4: Run Home tests and verify green**

Run: `npm test -- src/features/home/HomeScreen.test.tsx src/test/smoke.test.tsx`

Expected: all tests PASS and temporary scaffold copy is absent.

- [ ] **Step 5: Commit the first visible product checkpoint**

```bash
git add app/page.tsx src/features/home src/test/smoke.test.tsx
git commit -m "feat: replace scaffold with Atal home"
```

### Task 5: Implement the patient list, creation flow, and clinical record

**Files:**
- Create: `app/patients/page.tsx`
- Create: `app/patients/new/page.tsx`
- Create: `app/patients/[patientId]/page.tsx`
- Create: `app/patients/[patientId]/metrics/page.tsx`
- Create: `app/patients/[patientId]/history/page.tsx`
- Create: `app/patients/[patientId]/documents/page.tsx`
- Create: `src/features/patients/PatientListScreen.tsx`
- Create: `src/features/patients/PatientForm.tsx`
- Create: `src/features/patients/PatientDetailScreen.tsx`
- Create: `src/features/patients/PatientMetrics.tsx`
- Create: `src/features/patients/PatientHistory.tsx`
- Create: `src/features/patients/PatientDocuments.tsx`
- Create: `src/features/patients/patient-selectors.ts`
- Create: `src/features/patients/patients.test.tsx`

**Interfaces:**
- `filterPatients(snapshot, query, status, sort)` returns deterministic rows.
- `PatientForm` accepts `initialValue?` and `onSubmit(input)`.
- Patient detail tabs preserve route-based navigation.

- [ ] **Step 1: Write failing patient flow tests**

Test search, status filters, patient creation validation, persisted creation, detail tabs, archive, and restore.

- [ ] **Step 2: Run patient tests and verify red**

Run: `npm test -- src/features/patients/patients.test.tsx`

Expected: FAIL on missing patient screens.

- [ ] **Step 3: Implement M005 and M021 interactions**

Use high-density rows, mockup-aligned filter chips, an always-visible primary add action, Spanish labels, and native accessible controls. New patients appear immediately in list and Home metrics.

- [ ] **Step 4: Implement M009/M030/M031/M032 record tabs**

Render plan summary, clinical metrics, chronological events, notes, and document rows from the same patient entity. Destructive actions require an explicit confirmation dialog.

- [ ] **Step 5: Run patient tests and full unit suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit the patient checkpoint**

```bash
git add app/patients src/features/patients
git commit -m "feat: implement patient clinical records"
```

### Task 6: Implement the reusable exercise library

**Files:**
- Create: `app/exercises/page.tsx`
- Create: `app/exercises/new/page.tsx`
- Create: `app/exercises/[exerciseId]/page.tsx`
- Create: `src/features/exercises/ExerciseLibraryScreen.tsx`
- Create: `src/features/exercises/ExerciseDetailScreen.tsx`
- Create: `src/features/exercises/ExerciseForm.tsx`
- Create: `src/features/exercises/ExerciseSelector.tsx`
- Create: `src/features/exercises/exercise-selectors.ts`
- Create: `src/features/exercises/exercises.test.tsx`

**Interfaces:**
- `filterExercises(snapshot, query, region, category)` returns matching templates.
- `ExerciseSelector({ selectedIds, onChange, onConfirm })` supports multi-select.
- `ExerciseForm` normalizes rep-based and duration-based prescriptions.

- [ ] **Step 1: Write failing library tests**

Test searching, filtering, creation, editing, detail rendering, and multi-selection.

- [ ] **Step 2: Run tests and verify red**

Run: `npm test -- src/features/exercises/exercises.test.tsx`

Expected: FAIL on missing exercise screens.

- [ ] **Step 3: Implement M012/M014/M022/M025/M039**

Use dense media rows, category filters, clear dose typography, accessible upload presentation, and a selection confirmation bar. Use stable local exercise artwork assets or neutral mockup-consistent thumbnails; do not depend on random remote images.

- [ ] **Step 4: Run tests and verify green**

Run: `npm test -- src/features/exercises/exercises.test.tsx`

Expected: all exercise tests PASS.

- [ ] **Step 5: Commit the exercise checkpoint**

```bash
git add app/exercises src/features/exercises public/images/exercises
git commit -m "feat: implement exercise template library"
```

### Task 7: Implement plan creation, builder, review, activation, and progress

**Files:**
- Create: `app/plans/page.tsx`
- Create: `app/plans/new/page.tsx`
- Create: `app/plans/[planId]/page.tsx`
- Create: `app/plans/[planId]/edit/page.tsx`
- Create: `app/plans/[planId]/progress/page.tsx`
- Create: `app/plans/[planId]/review/page.tsx`
- Create: `src/features/plans/PlanListScreen.tsx`
- Create: `src/features/plans/PlanForm.tsx`
- Create: `src/features/plans/PlanBuilderScreen.tsx`
- Create: `src/features/plans/PlanSummaryScreen.tsx`
- Create: `src/features/plans/PlanProgressScreen.tsx`
- Create: `src/features/plans/PlanReviewScreen.tsx`
- Create: `src/features/plans/PlanSharePanel.tsx`
- Create: `src/features/plans/plan-selectors.ts`
- Create: `src/features/plans/plans.test.tsx`

**Interfaces:**
- `PlanForm` creates a draft linked to a patient.
- `PlanBuilderScreen` copies selected template values into `PlanExercise` rows.
- `movePlanExercise(planId, exerciseId, direction)` changes order without mutating templates.
- `activatePlan` updates all affected Home and patient selectors.

- [ ] **Step 1: Write failing plan workflow tests**

Test draft creation, exercise selection, prescription customization, reorder, review validation, activation, and previous-plan deactivation.

- [ ] **Step 2: Run plan tests and verify red**

Run: `npm test -- src/features/plans/plans.test.tsx`

Expected: FAIL on missing plan screens.

- [ ] **Step 3: Implement M007/M028 list and creation**

Use status sections and mockup-aligned patient/title/duration/frequency fields. Creation produces a draft and routes to the builder.

- [ ] **Step 4: Implement M008/M039 builder**

Support add, remove, reorder, and per-plan prescription editing. Persist on explicit save and show deterministic success feedback.

- [ ] **Step 5: Implement M036/M037/M038/M061 review and activation**

Review patient, objectives, exercise count, frequency, reporting rule, and link/PDF readiness before activation. Progress uses deterministic session metrics from local data.

- [ ] **Step 6: Run plan tests and full suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit the plan checkpoint**

```bash
git add app/plans src/features/plans src/data src/domain
git commit -m "feat: implement treatment plan workflow"
```

### Task 8: Complete responsive states, dark mode, and end-to-end verification

**Files:**
- Create: `app/settings/appearance/page.tsx`
- Create: `src/features/settings/AppearanceScreen.tsx`
- Create: `src/state/theme-store.ts`
- Create: `src/state/theme-store.test.ts`
- Create: `playwright.config.ts`
- Create: `tests/e2e/clinical-flow.spec.ts`
- Create: `tests/e2e/visual.spec.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-10-atal-clinical-core.md`

**Interfaces:**
- `themeStore` exposes `light | dark | system` and persists the choice.
- Playwright verifies a patient → exercise → plan activation flow.

- [ ] **Step 1: Write failing theme tests**

Test explicit light, explicit dark, system fallback, persistence, and document-class application.

- [ ] **Step 2: Run theme tests and verify red**

Run: `npm test -- src/state/theme-store.test.ts`

Expected: FAIL on missing theme store.

- [ ] **Step 3: Implement M065 appearance behavior and shared states**

Add Appearance controls and ensure all shell, list, form, detail, empty, skeleton, error, and confirmation components use tokens rather than hardcoded light-only colors.

- [ ] **Step 4: Write and run the end-to-end clinical flow**

Run: `npx playwright install chromium && npm run test:e2e -- tests/e2e/clinical-flow.spec.ts`

Expected: patient creation, exercise creation, plan creation, activation, and refresh persistence PASS.

- [ ] **Step 5: Capture native verification screenshots**

Capture Home, Patients, Patient Detail, Exercises, Plan Builder, and Plan Review at 430×764 and the master list/detail layouts at 1440×810. Compare against M004, M005, M009, M012, M008, M061, M076, and M077. Record mismatches and corrections in the plan checkpoint notes.

- [ ] **Step 6: Run the full verification gate**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
git status --short
```

Expected: all commands exit 0; no uncommitted temporary screenshots or QA artifacts remain.

- [ ] **Step 7: Update README and commit the verified block**

Document Google AI Studio usage, routes, local data reset, test commands, and explicitly deferred integrations.

```bash
git add .
git commit -m "feat: complete Atal clinical core block"
git push origin main
```

