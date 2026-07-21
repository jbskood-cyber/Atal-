# Atal Patient Delivery 3.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long patient-plan preview with an accessible PDF configurator that produces simple, flexible session-log and detailed documents.

**Architecture:** Keep `PatientPlanDocument` as the saved clinical source of truth. Add presentation-only options and deterministic page-capacity helpers, then route PDF creation to focused simple, session-log or detailed renderers. Print the generated PDF file instead of printing the app screen.

**Tech Stack:** React 19, TypeScript 5.9, existing local PDF writer, local browser APIs, Node test runner.

## Global Constraints

- Work only on `feature/atal-patient-delivery-3-1`.
- Do not modify `main`, `src/main.tsx`, approved CSS files or their import order.
- Preserve `#7EB695`, dark mode, dock and no-gradient rule.
- Add no dependency, backend, public link or network upload.
- Simple and session-log body text must never be smaller than 14 pt.
- Session tracking is numbered 1–99 and never grouped by weeks.

---

### Task 1: Delivery option contracts and normalization

**Files:**
- Modify: `src/features/patient-delivery/types.ts`
- Create: `src/features/patient-delivery/deliveryOptions.ts`
- Test: `tests/patient-delivery-3-1.test.mjs`

**Interfaces:**
- Produces: `PatientPlanDocumentMode`, `PatientPlanFontScale`, `PatientPlanLogFields`, `PatientPlanDeliveryOptions`, `DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS`, `normalizePatientPlanDeliveryOptions()`, `estimatePatientPlanPages()`.

- [ ] Add tests proving Simple is default, session count clamps to 1–99, per-exercise tracking is disabled without exercises, and at least one log field remains active.
- [ ] Implement the types and pure normalization helpers.
- [ ] Implement deterministic page estimation shared by UI and renderers.
- [ ] Run `npm test` and expect the new assertions to pass.

### Task 2: Accessible simple-plan renderer

**Files:**
- Create: `src/features/patient-delivery/pdfSimpleRenderer.ts`
- Modify: `src/features/patient-delivery/pdfRenderer.ts`
- Test: `tests/patient-delivery-3-1.test.mjs`

**Interfaces:**
- Consumes: `PatientPlanDocument`, normalized delivery options, `LocalPdfDocument`.
- Produces: `renderSimplePatientPlanPdf()` and mode routing through `createPatientPlanPdf()`.

- [ ] Add tests for the 14 pt minimum, optional exercise rows and continuation-page behavior.
- [ ] Draw one-page-first summary with accessible typography, plan facts, guidance, safety and professional details.
- [ ] Add compact exercise rows containing only exercise, sets, repetitions/duration and optional rest.
- [ ] Paginate without lowering the font floor.

### Task 3: Flexible rehabilitation-session log renderer

**Files:**
- Create: `src/features/patient-delivery/pdfSessionLogRenderer.ts`
- Modify: `src/features/patient-delivery/pdfRenderer.ts`
- Test: `tests/patient-delivery-3-1.test.mjs`

**Interfaces:**
- Produces: `renderPatientSessionLogPdf()` using the same page-capacity helpers as estimation.

- [ ] Add tests proving session terminology, custom count, general completion, per-exercise checkboxes and non-week-based pagination.
- [ ] Render a compact plan summary and optional exercise legend.
- [ ] Render each numbered session as a single unsplittable handwriting card.
- [ ] Include only selected fields: date, completion, per-exercise, pain, difficulty and notes.
- [ ] Repeat patient, plan and page numbering on continuation pages.

### Task 4: Generated-PDF print action

**Files:**
- Modify: `src/features/patient-delivery/deliveryActions.ts`
- Test: `tests/patient-delivery-3-1.test.mjs`

**Interfaces:**
- Replaces `printPatientPlan()` with `printPatientPlanPdf(result)`.

- [ ] Add a test confirming print consumes a PDF result rather than calling `window.print()` on the app page.
- [ ] Create a local blob URL and print through a temporary iframe.
- [ ] Fall back to opening the PDF in a new tab when iframe printing is unavailable.
- [ ] Revoke the blob URL and remove temporary DOM nodes safely.

### Task 5: Compact delivery configurator

**Files:**
- Modify: `src/screens/PatientPlanDeliveryScreen.tsx`
- Replace: `src/styles/atal-patient-delivery.css`
- Test: `tests/patient-delivery-3-1.test.mjs`

**Interfaces:**
- Consumes: option defaults, normalization, estimation and multi-mode `createPatientPlanPdf()`.

- [ ] Add tests asserting the full document preview is removed and the three document modes exist.
- [ ] Add mode selector, font selector and mode-specific controls.
- [ ] Add custom session count with presets and independently configurable tracking fields.
- [ ] Display a truthful output estimate from shared capacity helpers.
- [ ] Resolve multimedia only for Detailed mode when images are enabled.
- [ ] Keep download, share, non-active confirmation and all eligibility rules.
- [ ] Replace the isolated stylesheet with responsive controls matching the approved Atal system.

### Task 6: Regression and validation documentation

**Files:**
- Create: `docs/qa/2026-07-21-block-3-1-patient-delivery.md`
- Test: `tests/patient-delivery-3-1.test.mjs`

- [ ] Document technical commands and expected total test count.
- [ ] Document mobile validation at 360, 390, 412 and 430 px in light and dark mode.
- [ ] Document PDF checks for older-adult readability, one-page preference, 1/8/20/99 sessions, handwriting space and detailed-mode regression.
- [ ] Run `npm run quality` and record the exact evidence before merge.
