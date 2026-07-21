# Block 3.1 — Universal Premium Patient Delivery QA

## Technical validation

Run on `feature/atal-patient-delivery-3-1`:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Do not assume a test count. Record the exact passed and failed totals produced by the branch.

Required before merge:

- dependency installation succeeds;
- TypeScript reports zero errors;
- every test passes;
- production build succeeds;
- development server starts without console errors.

## Universal PDF cases

Validate the same renderer with at least these cases:

1. strength plan with 2–4 sets, laterality, elastic band and external load;
2. older-adult plan with extra-large type, repetitions, timed holds, minutes and tolerance-based activity;
3. mixed long plan with long patient and exercise names, isometrics, distance, load and `according to tolerance` dosing.

For each case confirm:

- saved `doseLabel` appears without being rewritten to a fixed `3 × 10`;
- rest and key instruction remain readable;
- long text wraps without overlap;
- the plan paginates without reducing type;
- the record table is `Exercise | Prescribed | Actual result | Discomfort`;
- no fixed `Series 1`, `Series 2`, `Series 3` columns appear;
- an exercise row is never split;
- long sessions use a clearly labelled continuation page;
- PDF signature starts with `%PDF-1.4` and opens in a real viewer.

## Modes

Validate:

- Plan + registro;
- Solo plan;
- Solo registro;
- Plan detallado under advanced options;
- detailed images disabled and enabled.

## Screen

At 360, 390, 412 and 430 px, in light and dark themes, confirm:

- no four-step flow;
- no wall of tracking switches;
- three primary document choices are understandable;
- session stepper clamps from 1 to 99;
- large and extra-large type selection works;
- advanced detailed option stays compact;
- estimate updates when mode, sessions or type changes;
- no horizontal overflow;
- approved dock, green `#7EB695`, theme and global metrics remain intact.

## WhatsApp

Test contacts with:

- patient phone only;
- responsible-contact phone only;
- both numbers;
- no valid number;
- formatting with spaces, `+`, parentheses and `00` international prefix.

Confirm:

- patient number has priority;
- responsible contact is the fallback;
- invalid numbers disable the action;
- the action opens `wa.me` with a prepared message;
- the message says the physiotherapist will attach the PDF;
- no PDF is uploaded, attached or sent automatically;
- native Share can still pass the actual generated PDF file to installed apps.

## Clinical and privacy regression

Confirm:

- active plans deliver directly;
- draft, paused and completed plans require confirmation and preserve status;
- archived patient or plan is blocked;
- empty plans and missing exercises are blocked;
- PDF uses only the saved plan;
- Network shows zero clinical uploads and zero external PDF conversion requests.

## Final evidence

Return:

- initial and final SHA;
- `npm ci`, typecheck, test and build output;
- exact test totals;
- page counts for the three universal cases;
- screenshots of the simplified screen in light and dark mode;
- downloaded sample PDFs;
- WhatsApp recipient/fallback results;
- console and Network results;
- corrections made;
- any remaining blocker.

Do not mark Block 3.1 complete and do not merge PR #11 while any required check fails.
