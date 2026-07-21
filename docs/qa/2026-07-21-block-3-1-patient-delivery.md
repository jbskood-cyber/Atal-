# Block 3.1 — Accessible Patient Delivery QA

## Technical validation

Run on `feature/atal-patient-delivery-3-1`:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Expected before merge:

- dependency installation succeeds;
- TypeScript reports zero errors;
- 30 tests pass and zero fail;
- production build succeeds;
- development console has no errors.

## Delivery-screen validation

Check 360, 390, 412 and 430 px in light and dark mode.

- The long embedded plan preview is absent.
- Patient, plan, duration, frequency and exercise count are visible without excessive scrolling.
- Simple, Session log and Detailed are clear and keyboard accessible.
- Large and Extra-large options are easy to understand.
- Session count accepts 1–99 and presets do not restrict custom values.
- General completion and per-exercise completion can both be enabled.
- Disabling exercises also disables per-exercise completion and rest.
- At least one session field always remains enabled.
- The page estimate updates after every configuration change.
- The approved dock, green `#7EB695`, icon language and dark mode remain unchanged.

## Simple-plan PDF

Test with zero optional exercise display, three exercises, four exercises and eight exercises.

- A common three-exercise plan fits on one A4 page in Large mode.
- Extra-large mode preserves its font size and paginates when required.
- Body content is at least 14 pt.
- Exercises show only name, series, repetitions or duration, and optional rest.
- Disabling exercises produces a professional one-page plan summary.
- Safety text remains readable and inside page bounds.
- Non-active plans keep their real status.

## Rehabilitation-session log

Generate logs with 1, 8, 20 and 99 sessions.

- The document is organized by numbered rehabilitation sessions, never weeks.
- Date fields are blank and patient-entered.
- General routine completion is independently selectable.
- Per-exercise checkboxes include every plan exercise and match the legend numbers.
- Pain before and after use 0–10 writing fields.
- Difficulty provides Easy, Good and Difficult checkboxes.
- Observation lines are large enough for handwriting.
- A session card never splits across pages.
- Continuation pages repeat patient, plan and page number.
- Page count matches the estimate shown in the app.

## Detailed-plan regression

- Detailed mode preserves the Block 3 clinical document.
- Images are loaded only when `Include available images` is enabled.
- Missing or unsupported media uses safe placeholders.
- No clinical data or media is uploaded.

## Delivery actions

- Download produces a real `%PDF-1.4` `application/pdf` file.
- Native share receives the configured PDF.
- Cancelling share does not download unexpectedly.
- Unsupported share falls back to local download.
- Print operates on the generated PDF, not the configuration screen.
- If iframe printing is unavailable, the PDF opens in a viewer for printing.

## Scope protection

- No dependency added.
- No workflow added.
- No backend, public link or cloud PDF service added.
- `src/main.tsx` and approved CSS import order unchanged.
- Existing approved styles are not edited; only the isolated delivery stylesheet changes.
