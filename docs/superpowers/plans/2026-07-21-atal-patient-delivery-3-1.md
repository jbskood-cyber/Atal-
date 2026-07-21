# Atal Patient Delivery 3.1 — Universal Premium Implementation

## Goal

Replace the long configurator and rigid session form with one universal premium document system and a compact delivery screen.

## Constraints

- Work only on `feature/atal-patient-delivery-3-1` and PR #11.
- Do not modify or merge `main` before final evidence.
- Preserve `src/main.tsx`, approved CSS order, dock, themes, `#7EB695` and no-gradient rule.
- Add no dependency, backend, public link, clinical upload or WhatsApp API.
- Keep detailed delivery as an advanced local option.

## Implemented architecture

- [x] Canonical saved `PatientPlanDocument` remains the clinical source of truth.
- [x] Patient phone and responsible contact are copied into the delivery model.
- [x] Delivery modes are `plan-and-log`, `plan-only`, `log-only` and `detailed`.
- [x] Default mode is Plan + registro with 8 flexible sessions.
- [x] One deterministic page estimator is shared by UI and PDF rendering.
- [x] A universal monochrome renderer composes plan pages and session records.
- [x] Prescriptions use the saved `doseLabel`; no fixed repetition or series assumption exists.
- [x] Session rows use `Exercise | Prescribed | Actual result | Discomfort`.
- [x] Long plans and sessions paginate without shrinking type or splitting rows.
- [x] The detailed Block 3 renderer remains available with opt-in local images.
- [x] The screen exposes only document mode, session count, readability, recipient and actions.
- [x] WhatsApp resolves patient phone first and responsible contact as fallback.
- [x] WhatsApp opens the chat and prepared message without attaching or sending the PDF.
- [x] Native Share remains capable of handing the real PDF file to installed apps.
- [x] Download and print continue to operate on the generated PDF.
- [x] Tests and QA documentation describe the definitive behavior.

## Validation still required

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] browser validation at 360, 390, 412 and 430 px
- [ ] light and dark theme screenshots
- [ ] three varied universal PDF cases
- [ ] real viewer, print and native-share checks
- [ ] patient/responsible WhatsApp fallback checks
- [ ] console and Network privacy checks

## Merge rule

PR #11 remains a draft. It may be marked ready and merged only after every validation item passes with evidence and the final head SHA is unchanged during review.
