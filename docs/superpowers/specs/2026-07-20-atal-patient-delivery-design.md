# Atal Patient Delivery Design

## Goal

Deliver a professional, privacy-conscious patient plan from Atal as a real PDF generated on the device, with reliable download, print and native share actions, while keeping the patient portal and the generated document clinically consistent.

## Product Scope

This block covers only patient delivery. It does not add a public patient link, backend storage, authentication, WhatsApp API integration, billing or cloud document generation.

The delivery flow must work without a server and without per-document fees.

## Recommended Architecture

### 1. Canonical delivery model

Create one pure builder that converts the current local Atal state into a `PatientPlanDocument` model. Both the printable preview and the PDF renderer consume this same model.

The model contains:

- document version and generation date;
- patient identity and clinically relevant diagnosis/area;
- professional name, specialty and clinic;
- plan identity, status, objective, duration, frequency, progression and general instructions;
- ordered exercises with dose, rest, starting position, instructions, precautions, pain threshold, equipment and available media reference;
- privacy and delivery metadata.

Only a saved plan may be delivered. By default the action is enabled for an active plan. A non-active plan must show a clear status warning and must not be silently presented as current treatment.

### 2. Local PDF generation

Generate the PDF entirely in the browser. Use a small open-source PDF library with no hosted service and no runtime API calls.

The renderer must:

- produce an A4 portrait document;
- use predictable page breaks;
- repeat a compact header on additional pages;
- include page number, generation date and plan update date;
- preserve Spanish accents and readable typography;
- include exercise images when a supported local image is available;
- fall back to a polished exercise placeholder when media is absent or not embeddable;
- avoid exposing internal storage IDs as primary content;
- generate a deterministic, sanitized filename.

No clinical data is uploaded during generation.

### 3. Preview, download, print and share

Add a patient-delivery screen reachable from the plan and patient portal preview.

Actions:

- `Vista previa`: renders the canonical document model in the app.
- `Descargar PDF`: generates and downloads a real `.pdf` file.
- `Compartir`: uses the Web Share API with the generated PDF file when supported.
- `Imprimir`: opens the browser print flow using the same canonical content.

Fallbacks:

- If file sharing is unsupported, retain the generated file and offer download.
- If PDF generation fails, show a specific recoverable error without losing the plan.
- If a media asset cannot be embedded, continue with a placeholder and report that media was omitted.
- Never claim that WhatsApp received the file; Atal only opens the operating system share sheet.

### 4. Portal consistency

The patient portal and document must use the same live plan resolver and the same ordered exercise content.

The portal must expose a delivery action only when the plan is eligible. The document must reflect the current saved plan, not an unsaved editor draft and not a completed session snapshot.

A regression test must prove that plan title, instructions, exercise order and dose come from the same canonical model used by delivery.

## Document Content and Quality

### Cover and summary

- Atal mark and document title;
- patient name;
- professional and clinic;
- plan title and status;
- objective;
- duration and frequency;
- general instructions;
- generated and last-updated dates.

### Exercise pages

Each exercise shows:

- sequence number and name;
- region and objective;
- image or safe placeholder;
- sets;
- repetitions or duration;
- rest;
- starting position;
- ordered instructions;
- precautions;
- equipment;
- maximum acceptable pain when present.

### Footer

- page number;
- patient name;
- plan title;
- a concise safety note instructing the patient to stop and contact the professional when symptoms exceed the prescribed limits.

## Privacy and Safety

- Generation is local-only.
- No public URL is created.
- Sharing occurs only after an explicit user action.
- Clinical privacy settings remain respected in the portal; the professional delivery document deliberately includes the selected patient identity because it is an addressed clinical document.
- The UI must warn before delivering an archived, completed, paused or draft plan as if it were active.
- Unsupported multimedia is never converted through a third-party service.

## Visual Constraints

- Preserve all approved Atal CSS layers, dock, dark mode, icon language and official green `#7EB695`.
- Do not introduce gradients.
- New UI must compose existing Atal patterns rather than restyling the application.
- PDF appearance may have its own print layout but must remain consistent with Atal branding and clinical readability.

## Technical Boundaries

Suggested focused units:

- `src/features/patient-delivery/types.ts`: delivery model contracts.
- `src/features/patient-delivery/buildPatientPlanDocument.ts`: pure canonical model builder.
- `src/features/patient-delivery/mediaResolver.ts`: safe local image resolution and omission reasons.
- `src/features/patient-delivery/pdfRenderer.ts`: PDF generation.
- `src/features/patient-delivery/deliveryActions.ts`: filename, download, print and share fallbacks.
- `src/screens/PatientPlanDeliveryScreen.tsx`: preview and actions.
- targeted route wiring in the existing app router.
- targeted entry actions from plan detail and patient portal preview.

Do not place PDF logic inside the plan screen or portal screen.

## Acceptance Criteria

- A saved active plan produces a valid PDF with the correct patient, professional, plan and ordered exercise content.
- The PDF downloads with a sanitized filename and opens as a PDF.
- Native sharing receives the PDF file on supported mobile browsers.
- Unsupported sharing falls back to download without data loss.
- Printing uses the same canonical content.
- Missing media does not abort generation.
- No network request is required for generation.
- Portal and PDF agree on plan title, exercise order, dose and instructions.
- Draft or paused plans cannot be misleadingly delivered as active treatment.
- Typecheck, unit tests and production build pass.
- Mobile validation covers 360–430 px in light and dark mode.
- Existing CSS files and final import order remain unchanged unless a narrowly scoped new print stylesheet is required; existing approved rules are not edited.

## Testing Strategy

- Unit tests for canonical document construction, order preservation, dose formatting and filename sanitization.
- Unit tests for plan eligibility and privacy metadata.
- Unit tests for share capability and download fallback using mocked browser APIs.
- Regression tests confirming portal and PDF derive from the canonical plan content.
- Production build verification.
- Manual mobile checks for active, paused, draft, archived, no-media and multi-page plans.

## Explicit Non-Goals

- Public share links.
- Cloud-hosted patient portals.
- Automatic WhatsApp sending.
- Electronic signatures.
- Backend audit logs.
- Server-side PDF generation.
- Payment or subscription enforcement.
