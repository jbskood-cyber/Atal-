# Atal Patient Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, preview, download, print and natively share a professional patient-plan PDF entirely on the device while keeping the portal and document clinically consistent.

**Architecture:** A pure canonical builder converts `AtalState` into a versioned `PatientPlanDocument`. A focused local PDF engine renders that model to A4 bytes, optionally embedding locally stored images converted to JPEG. The delivery screen, print preview and portal entry points consume the same model and never upload clinical data.

**Tech Stack:** React 19, TypeScript 5.9, Vite, IndexedDB, Web Share API, browser Blob/File APIs, custom dependency-free PDF 1.4 writer.

## Global Constraints

- Work only on `feature/atal-patient-delivery`; never commit directly to `main`.
- Preserve the approved Atal visual layers, dock, dark mode and official green `#7EB695`.
- Do not introduce gradients or edit the existing final CSS layers/import order.
- Generate documents locally with no server, API charge or clinical-data upload.
- No public links, WhatsApp API, backend, authentication, billing or cloud storage.
- The generated document must represent saved data, never an unsaved editor draft.

---

### Task 1: Canonical patient-delivery model

**Files:**
- Create: `src/features/patient-delivery/types.ts`
- Create: `src/features/patient-delivery/buildPatientPlanDocument.ts`
- Test: `tests/patient-delivery.test.mjs`

**Interfaces:**
- Consumes: `AtalState`, `PatientEntity`, `PlanEntity`, `ExerciseEntity`.
- Produces: `buildPatientPlanDocument(state, patientId, planId, generatedAt)`, `getPatientPlanDeliveryEligibility(state, patientId, planId)`, `formatExerciseDose(exercise)`.

- [ ] Write regression tests asserting the canonical builder, saved-state source, order preservation, dose, professional metadata and explicit status eligibility.
- [ ] Implement versioned document and exercise contracts with no internal IDs exposed as primary content.
- [ ] Implement deterministic model construction and explicit active/non-active/blocked delivery states.
- [ ] Confirm portal and PDF can consume the same ordered plan content.
- [ ] Commit: `feat: add canonical patient delivery model`.

### Task 2: Local multimedia and dependency-free PDF engine

**Files:**
- Create: `src/features/patient-delivery/mediaResolver.ts`
- Create: `src/features/patient-delivery/pdfWriter.ts`
- Create: `src/features/patient-delivery/pdfRenderer.ts`
- Test: `tests/patient-delivery.test.mjs`

**Interfaces:**
- Consumes: `PatientPlanDocument`, IndexedDB exercise media.
- Produces: `resolvePatientPlanMedia(document)`, `createPatientPlanPdf(document, media) -> Promise<PatientPlanPdfResult>`.

- [ ] Add tests for local-only media resolution, missing-media fallback, PDF signature and A4/page metadata source markers.
- [ ] Convert supported local image blobs to bounded JPEG bytes in-browser; never contact a third party.
- [ ] Implement a PDF 1.4 byte writer with WinAnsi Spanish text, Helvetica fonts, vector branding, image XObjects and valid xref offsets.
- [ ] Render a cover/summary page and one polished exercise section per page with continuation pages when necessary.
- [ ] Add repeated header, page count, generation/update dates and clinical safety footer.
- [ ] Commit: `feat: generate patient plan PDFs locally`.

### Task 3: Download, print and native sharing

**Files:**
- Create: `src/features/patient-delivery/deliveryActions.ts`
- Test: `tests/patient-delivery.test.mjs`

**Interfaces:**
- Consumes: generated PDF bytes and canonical document.
- Produces: `patientPlanFilename(document)`, `downloadPatientPlanPdf(result)`, `sharePatientPlanPdf(result)`, `printPatientPlan()`.

- [ ] Add tests for filename sanitization, `.pdf` MIME, Web Share file capability and download fallback.
- [ ] Implement deterministic filename creation without unsafe path characters.
- [ ] Implement real Blob download with URL cleanup.
- [ ] Implement native file sharing and a truthful fallback result when unsupported or cancelled.
- [ ] Implement print through the canonical preview only.
- [ ] Commit: `feat: add patient plan delivery actions`.

### Task 4: Delivery preview screen and route wiring

**Files:**
- Create: `src/screens/PatientPlanDeliveryScreen.tsx`
- Create: `src/styles/atal-patient-delivery.css`
- Modify: `src/AppCloseout.tsx`
- Modify: `src/screens/PlanDetailCloseoutScreen.tsx`
- Modify: `src/screens/PatientPortalPreviewScreen.tsx`
- Test: `tests/patient-delivery.test.mjs`

**Interfaces:**
- Consumes: canonical document builder, PDF renderer, delivery actions.
- Produces: `/plans/:id/delivery`, plan-detail action and portal action.

- [ ] Add tests for the delivery route, plan entry action, portal entry action and scoped stylesheet import.
- [ ] Build a mobile-first preview with loading, blocked, warning, ready, media-omission and action-result states.
- [ ] Require explicit confirmation before generating paused, completed or draft plans; block archived patient/plan delivery.
- [ ] Add download, native share and print actions with progress locking and recoverable errors.
- [ ] Add print-only A4 styling scoped to the delivery screen without changing existing styles or `main.tsx` imports.
- [ ] Wire plan-detail and patient-portal entry points through saved plan IDs.
- [ ] Commit: `feat: add patient plan delivery experience`.

### Task 5: Final integrity and mobile QA

**Files:**
- Update: `tests/patient-delivery.test.mjs`
- Create: `docs/qa/2026-07-21-block-3-patient-delivery.md`

**Interfaces:**
- Consumes: complete Block 3 implementation.
- Produces: repeatable validation checklist and final branch evidence.

- [ ] Verify tests cover canonical consistency, local generation, image fallback, status safety, sharing fallback and visual protection.
- [ ] Run `npm ci`.
- [ ] Run `npm run quality`; expected result is typecheck 0 errors, all tests passing and production build successful.
- [ ] Generate and inspect active, paused, no-media and multi-page documents on 360-430 px viewports in light and dark mode.
- [ ] Confirm downloaded bytes start with `%PDF-1.4`, filename ends in `.pdf`, sharing receives a `File`, and no network request is made.
- [ ] Confirm no existing CSS file or `src/main.tsx` import order changed.
- [ ] Commit: `test: verify Atal patient delivery`.
