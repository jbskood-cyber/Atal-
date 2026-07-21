# Atal Patient Delivery 3.1 Design

## Goal

Transform patient delivery into an accessible, compact and configurable experience for older adults and everyday rehabilitation follow-up, while preserving the detailed plan as an optional format.

## Product Principles

- The physiotherapist chooses the number of rehabilitation sessions to record; the document is never tied to calendar weeks.
- Readability is more important than forcing content onto one page.
- The simple plan should prefer one A4 page, but must paginate rather than shrink below the accessible font floor.
- Exercise details are optional.
- Both a general completion checkbox and per-exercise checkboxes are available and independently configurable.
- All PDFs remain local, private, dependency-free and compatible with the existing download, print and native-share flow.

## Document Modes

### Simple plan

Default format. It contains patient, plan, objective, duration, frequency, general guidance, professional and safety note. Exercises are optional and, when included, show only name, sets, repetitions or duration, and optionally rest.

Target typography:
- body: 14 pt;
- important values: 16–18 pt;
- patient and plan titles: 22–26 pt;
- safety copy: at least 11 pt.

The renderer should fit common plans on one A4 page. When the selected content does not fit, it adds continuation pages without reducing the accessible font size.

### Rehabilitation session log

A printable form organized by numbered rehabilitation sessions rather than weeks. The physiotherapist selects any session count from 1 to 99, aided by quick presets but never restricted to them.

Configurable fields:
- session number;
- open date field;
- general routine completion checkbox;
- individual checkbox for each included exercise;
- pain before;
- pain after;
- perceived difficulty: easy, adequate, difficult;
- observations.

The form uses large handwriting spaces and automatically paginates. Every continuation page repeats patient, plan and page numbering.

### Detailed plan

Preserves the current multi-page document with images, position, instructions, precautions, equipment, pain threshold and therapist notes. It remains available for cases requiring full teaching material, but is no longer the default.

## Delivery Screen

Remove the long embedded document preview. The screen becomes a compact document configurator containing:

1. patient and saved-plan summary;
2. document-mode selector: Simple, Session log, Detailed;
3. accessibility control: Large or Extra large;
4. mode-specific options;
5. estimated output summary: pages, sessions, exercises and font size;
6. Download, Share and Print actions.

### Simple options

- Include exercises;
- include rest;
- font size.

### Session-log options

- number of sessions, 1–99;
- include exercises;
- include rest in the exercise legend;
- general completion checkbox;
- per-exercise checkboxes;
- date;
- pain before;
- pain after;
- difficulty;
- observations;
- font size.

At least one tracking field must remain active. Per-exercise checkboxes are automatically disabled when exercises are excluded.

### Detailed options

- include images;
- font size does not alter the proven detailed clinical layout, but the screen clearly labels it as a multi-page teaching document.

## Canonical Data and PDF Architecture

The existing `PatientPlanDocument` remains the clinical source of truth. A new `PatientPlanDeliveryOptions` object controls presentation only and never mutates clinical data.

Focused units:
- `types.ts`: delivery modes and option contracts;
- `deliveryOptions.ts`: defaults, normalization and page estimation;
- `pdfRenderer.ts`: route to simple, log or detailed renderers;
- `pdfSimpleRenderer.ts`: accessible compact plan;
- `pdfSessionLogRenderer.ts`: flexible numbered-session form;
- existing detailed renderer remains isolated;
- `PatientPlanDeliveryScreen.tsx`: compact configurator without full preview;
- `deliveryActions.ts`: print the generated PDF, not the web screen.

## Page Estimation

Estimation is deterministic and conservative:
- Simple: one page for the summary plus the accessible exercise-row capacity; continuation pages when needed.
- Session log: calculate first-page and continuation capacities from font scale, enabled fields, exercise legend and per-exercise checkbox row height.
- Detailed: one cover plus at least one page per exercise, matching the existing renderer.

The estimate displayed in the UI must use the same capacity functions used by rendering.

## Accessibility

- No body copy below 14 pt in Simple and Session log.
- Extra-large mode raises body and row sizes without clipping.
- High contrast; avoid faint grey for essential instructions.
- Form checkboxes and writing lines must be large enough for pen use.
- Never truncate session rows or split one session across pages.
- Preserve Spanish accents.

## Safety and Privacy

- Plan eligibility rules remain unchanged.
- Non-active plans require explicit confirmation and retain their real status in every format.
- Archived patients, archived plans, empty plans and missing exercises remain blocked.
- No public URL, backend call, upload or third-party conversion.
- The PDF always uses the saved plan, never an unsaved editor draft.

## Visual Constraints

- Preserve the approved Atal system, dock, themes and green `#7EB695`.
- No gradients.
- Replace only the isolated patient-delivery stylesheet.
- Do not modify `src/main.tsx` or the approved final CSS import order.

## Acceptance Criteria

- Simple is the default mode and omits exercises only when selected by the physiotherapist.
- A common three-exercise plan fits on one A4 page with body text at least 14 pt.
- Session count accepts any integer from 1 to 99 and is unrelated to weeks.
- General and per-exercise completion controls can both be enabled.
- Large session rows provide date, pain, difficulty and notes spaces according to selected fields.
- Long logs paginate without shrinking fonts or splitting rows.
- Detailed mode remains available and clinically equivalent to Block 3.
- The delivery screen contains no long full-document preview.
- Printing uses the generated PDF.
- Download and native sharing continue to use a real `application/pdf` file.
- Typecheck, tests, build and mobile validation pass.