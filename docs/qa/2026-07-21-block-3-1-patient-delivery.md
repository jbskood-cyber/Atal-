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

1. **Strength, load and laterality**
   - 2–4 sets;
   - repetitions per side;
   - elastic band;
   - external load;
   - an exercise configured with both repetitions and time;
   - different rest descriptions.
2. **Older adult / extra-large type**
   - long patient name;
   - repetitions;
   - timed holds;
   - minutes;
   - tolerance-based activity;
   - free or as-needed rest.
3. **Mixed long plan**
   - six or more exercises;
   - long patient, plan and exercise names;
   - long therapeutic objective;
   - isometrics;
   - minutes;
   - distance;
   - load;
   - maximum or tolerance prescription.

For each case confirm:

- saved prescription appears without being rewritten to a fixed `3 × 10`;
- exercises configured as **Ambos** preserve repetitions and time;
- useful equipment or load appears in `Indicado`, while generic material text is omitted;
- rest and key instruction remain readable;
- row height grows when wrapped text needs more space;
- long text wraps without overlap, clipping or collision with the next row;
- the plan paginates without reducing type;
- final plan page includes professional responsible and next-review space;
- the record table is `Ejercicio | Indicado | Resultado real | Molestia`;
- no fixed `Serie 1`, `Serie 2`, `Serie 3` columns appear;
- an exercise row is never split;
- long sessions use a clearly labelled continuation page;
- final session part includes Completa, Parcial, Suspendida, Suave, Adecuado and Intenso;
- estimated page count equals actual page count;
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
- default is Plan + registro;
- session stepper clamps from 1 to 99;
- large and extra-large type selection works;
- advanced detailed option stays compact and collapsed by default;
- estimate updates when mode, sessions or type changes;
- download remains the primary preparation action;
- WhatsApp is a separate redirect action;
- Native Share and Print remain secondary actions;
- no horizontal overflow;
- approved dock, green `#7EB695`, theme and global metrics remain intact.

## WhatsApp

Test contacts with:

- patient phone only;
- responsible-contact phone only;
- both numbers;
- no valid number;
- responsible contact containing a name plus a phone number;
- formatting with spaces, dots, hyphens, `+`, parentheses and `00` international prefix.

Confirm:

- patient number has priority;
- responsible contact is the fallback;
- invalid numbers disable the action;
- the action opens `wa.me` with a prepared message;
- the message says the physiotherapist will attach the PDF;
- opening WhatsApp does not claim successful delivery;
- no PDF is uploaded, attached or sent automatically;
- the physiotherapist chooses the attachment and presses Send;
- native Share can still pass the actual generated PDF file to installed apps.

## Clinical and privacy regression

Confirm:

- active plans deliver directly;
- draft, paused and completed plans require confirmation and preserve status;
- changing document options does not repeatedly reset an already accepted confirmation;
- archived patient or plan is blocked;
- empty plans and missing exercises are blocked;
- PDF uses only the saved plan snapshot;
- detailed multimedia remains local and opt-in;
- Network shows zero clinical uploads and zero external PDF conversion requests.

## Final evidence

Return:

- initial and final SHA;
- `npm ci`, typecheck, test and build output;
- exact test totals;
- page estimates and actual page counts for the three universal cases;
- screenshots of the simplified screen at the required widths in light and dark mode;
- downloaded sample PDFs opened in a real viewer;
- mixed repetitions/time and load/equipment results;
- WhatsApp recipient/fallback results;
- Native Share and print results;
- console and Network results;
- corrections made;
- any remaining blocker.

Do not mark Block 3.1 complete and do not merge PR #11 while any required check fails.