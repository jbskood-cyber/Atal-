# Atal Patient Delivery 3.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a universal premium plan-and-session PDF, a compact Atal-native delivery screen, and a safe WhatsApp redirect that never sends or attaches files automatically.

**Architecture:** Keep `PatientPlanDocument` as the immutable saved-plan snapshot. Use one pure layout module to measure wrapped text and produce deterministic plan/log page chunks shared by the estimator and PDF renderer. Route universal modes to the monochrome renderer and retain the existing detailed renderer behind advanced options.

**Tech Stack:** React 19, TypeScript 5.9, Vite, local PDF 1.4 writer, Node test runner.

## Global Constraints

- Work only on `feature/atal-patient-delivery-3-1` and PR #11.
- Do not merge or modify `main` before final evidence.
- Do not add dependencies, workflows, backend, public links, cloud storage or WhatsApp API.
- Preserve `src/main.tsx`, approved CSS order, dock, themes, `#7EB695` and the no-gradient rule.
- PDF generation and multimedia processing remain local.
- WhatsApp only opens the saved recipient; the physiotherapist chooses what to attach and when to send.
- Never reduce accessible type to hide overflow.

---

### Task 1: Lock universal layout behavior with tests

**Files:**
- Modify: `tests/patient-delivery-3-1.test.mjs`

**Produces:** Static regression checks for measured rows, adaptive page chunks, professional footer, intense effort, simplified UI and non-automatic WhatsApp behavior.

- [x] Add assertions for measured plan/log row helpers and page chunk builders.
- [x] Add assertions that the renderer consumes layout rows instead of fixed count slicing.
- [x] Add assertions for professional information and `Intenso` effort.
- [x] Preserve checks for universal result fields and absence of fixed series columns.

### Task 2: Measure and paginate universal content

**Files:**
- Modify: `src/features/patient-delivery/deliveryOptions.ts`

**Produces:**
- `compactPatientPlanDose(exercise)`
- `layoutPatientPlanPages(documentModel, fontScale)`
- `layoutPatientLogPages(documentModel, fontScale)`
- `estimatePatientPlanPages(documentModel, options)` using the same chunks as rendering.

- [x] Measure visible wrapped lines for name, prescription, rest and key instruction.
- [x] Calculate row heights with minimum accessible spacing.
- [x] Pack rows into first, continuation and final pages while reserving final safety/outcome space.
- [x] Keep every row complete and guarantee at least one row per page.
- [x] Derive plan and log page counts from the measured chunks.
- [x] Preserve mixed repetitions/time and append only useful load or equipment.

### Task 3: Render adaptive premium PDF pages

**Files:**
- Modify: `src/features/patient-delivery/pdfUniversalRenderer.ts`

**Consumes:** Layout rows and page chunks from Task 2.

- [x] Draw plan exercise rows using measured heights and line counts.
- [x] Draw log rows using measured heights and the universal actual-result field.
- [x] Use adaptive chunks for plan continuation and each session.
- [x] Add professional responsible and next-review lines to the final plan page.
- [x] Add light, adequate and intense perceived-effort choices.
- [x] Keep monochrome styling, accessible type and local PDF 1.4 generation.

### Task 4: Harden recipient routing and compact screen behavior

**Files:**
- Modify: `src/features/patient-delivery/deliveryActions.ts`
- Modify: `src/screens/PatientPlanDeliveryScreen.tsx`
- Modify: `src/styles/atal-patient-delivery.css`

- [x] Normalize common phone punctuation, responsible-contact text and `00` prefix without claiming delivery success.
- [x] Prefer patient phone and use responsible contact only as fallback.
- [x] Keep Download as the primary preparation action and WhatsApp as a separate redirect.
- [x] Keep only document mode, session count, readability and collapsed advanced options visible.
- [x] Preserve native Share for attaching the real PDF and Print for the generated PDF.

### Task 5: Validate and close

**Files:**
- Modify: `docs/qa/2026-07-21-block-3-1-patient-delivery.md`
- Modify: `docs/handoffs/2026-07-21-atal-block-3-1-universal-delivery.md`

- [ ] Run `npm ci`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test` and report exact totals.
- [ ] Run `npm run build`.
- [ ] Validate 360, 390, 412 and 430 px in light and dark mode.
- [ ] Open three varied PDFs in a real viewer and compare estimated/actual page counts.
- [ ] Validate patient/responsible WhatsApp routing, Native Share, print, console and Network privacy.
- [ ] Keep PR #11 draft until every item passes; merge only with the validated expected-head SHA.