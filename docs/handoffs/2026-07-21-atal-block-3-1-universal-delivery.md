# HANDOFF — Atal Block 3.1 Universal Premium Patient Delivery

## Repository

- Repository: `jbskood-cyber/Atal-`
- Branch: `feature/atal-patient-delivery-3-1`
- Pull request: `#11`
- Base: `main`
- Base SHA at branch creation: `be1258820a3c35d437ee9ea8d7774f7eef02d7da`
- PR remains draft and unmerged until runtime validation is complete.

Always obtain the authoritative validation SHA after checkout:

```bash
git pull --ff-only origin feature/atal-patient-delivery-3-1
git rev-parse HEAD
```

Do not reuse an older SHA embedded in a chat or document. Report the initial SHA from the command above and any final SHA created by validation fixes.

## Approved behavior

### Document

The default mode is **Plan + registro**. Alternatives are **Solo plan**, **Solo registro**, and the existing **Plan detallado** under advanced options.

The universal PDF must support:

- repetitions;
- time;
- repetitions plus time when an exercise uses **Ambos**;
- minutes;
- distance;
- laterality;
- isometrics;
- load or useful equipment;
- tolerance and maximum-based instructions;
- long names, objectives and prescriptions.

The template adapts to the plan. It never reduces accessible type or distorts clinical content to force a page count.

### Universal record

Every session uses:

`Ejercicio | Indicado | Resultado real | Molestia`

`Resultado real` accepts free human-readable entries such as:

- `10 / 10 / 8`;
- `30 s / 25 s / 20 s`;
- `12 min`;
- `D: 10 / I: 8`;
- `8 rep con 6 kg`;
- `no realizado`.

No fixed series columns are generated.

### Screen

The delivery screen follows global Atal metrics and exposes only:

- Plan + registro / Solo plan / Solo registro;
- number of rehabilitation sessions;
- large / extra-large type;
- collapsed advanced detailed option;
- recipient and page estimate;
- Download, Open WhatsApp, Native Share and Print.

It does not show the former four-step flow or a wall of switches.

### WhatsApp

- Patient phone has priority.
- Responsible-contact phone is the fallback.
- Common punctuation, `+`, `00` and responsible-contact text are normalized.
- Atal opens `wa.me` with a prepared message.
- Atal never uploads, attaches or sends the PDF automatically.
- The physiotherapist selects the attachment and presses Send.
- Native Share remains the action capable of passing the real PDF file to installed applications.

## Implementation

### Saved snapshot

`buildPatientPlanDocument.ts` remains the canonical immutable delivery snapshot. It copies patient/responsible phones and now preserves mixed repetitions plus time in `doseLabel`.

### Adaptive layout

`deliveryOptions.ts` is shared by estimation and rendering. It provides:

- `measurePatientPlanRow`;
- `measurePatientLogRow`;
- `layoutPatientPlanPages`;
- `layoutPatientLogPages`;
- `compactPatientPlanDose`;
- `estimatePatientPlanPages`.

Rows are measured from their wrapped name, prescription, rest and key instruction. Page chunks reserve space for final safety/session sections and never split an exercise row.

Useful equipment or load is appended to `Indicado`; generic values such as “sin material”, “no aplica” or “según indicación” are omitted.

### Universal PDF

`pdfUniversalRenderer.ts` consumes the same measured page chunks used by the estimator.

Plan pages include:

- patient and true plan status;
- diagnosis/area;
- frequency and duration;
- objective;
- exercises with real prescription, useful equipment/load, rest and key instruction;
- safety;
- professional responsible;
- next-review space.

Session pages include:

- numbered session and continuation labels;
- date and pain before/after;
- universal result table;
- Complete / Partial / Stopped;
- Light / Adequate / Intense effort;
- observations.

The PDF remains local, dependency-free, A4, PDF 1.4 and monochrome.

### Detailed document

`pdfRouter.ts` keeps the original detailed renderer. Multimedia is resolved locally only when detailed mode and images are explicitly enabled.

### Protected visual system

- UI green stays `#7EB695`.
- No gradients.
- Dock, themes and approved global layout remain intact.
- `src/main.tsx` is unchanged.
- Delivery CSS remains isolated.

## Files to inspect

- `src/features/patient-delivery/buildPatientPlanDocument.ts`
- `src/features/patient-delivery/deliveryActions.ts`
- `src/features/patient-delivery/deliveryOptions.ts`
- `src/features/patient-delivery/pdfRouter.ts`
- `src/features/patient-delivery/pdfUniversalRenderer.ts`
- `src/features/patient-delivery/types.ts`
- `src/screens/PatientPlanDeliveryScreen.tsx`
- `src/styles/atal-patient-delivery.css`
- `tests/patient-delivery.test.mjs`
- `tests/patient-delivery-3-1.test.mjs`
- `docs/qa/2026-07-21-block-3-1-patient-delivery.md`

## Validation status

This chat environment could not clone or execute the repository because outbound GitHub DNS resolution was unavailable. It therefore does **not** claim that typecheck, tests, build, runtime rendering or generated PDFs pass.

Run in an executable environment:

```bash
git fetch origin
git checkout feature/atal-patient-delivery-3-1
git pull --ff-only origin feature/atal-patient-delivery-3-1
git status
git rev-parse HEAD
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Report exact test totals; do not assume a number.

## Required runtime cases

### PDF 1 — strength, load and laterality

- 2–4 sets;
- repetitions per side;
- band;
- external load;
- one exercise using repetitions plus time;
- varied rest descriptions.

### PDF 2 — older adult

- extra-large type;
- long patient name;
- repetitions;
- timed holds;
- minutes;
- tolerance-based activity;
- free or as-needed rest.

### PDF 3 — long mixed plan

- six or more exercises;
- long names and objective;
- isometrics;
- minutes;
- distance;
- load;
- maximum/tolerance prescription.

For every PDF verify:

- `%PDF-1.4` signature and real viewer opening;
- prescription is not rewritten to fixed `3 × 10`;
- repetitions plus time survive together;
- useful equipment/load appears;
- measured wrapping and pagination have no overlaps, clipping or footer collisions;
- rows never split;
- professional and next-review information appears;
- Complete/Partial/Stopped and Light/Adequate/Intense appear;
- estimated and actual page counts match;
- download, Native Share and print work.

### Screen

At 360, 390, 412 and 430 px in light and dark mode verify:

- compact global Atal metrics;
- no horizontal overflow;
- no four-step flow;
- no wall of switches;
- modes, stepper and type selection work;
- stepper clamps at 1 and 99;
- estimate updates;
- detailed option stays compact;
- dock remains unchanged;
- no console errors.

### WhatsApp

Verify:

- patient-only number;
- responsible-only number;
- both numbers, with patient winning;
- no valid number;
- responsible name plus phone;
- `+`, spaces, dots, hyphens, parentheses and `00` prefix;
- correct `wa.me` recipient/message;
- no automatic attachment, sending or clinical upload.

### Clinical regression

- active plan delivers directly;
- draft/paused/completed require confirmation and preserve status;
- archived patient/plan, empty plan and missing exercise are blocked;
- saved plan snapshot is used;
- detailed mode and optional local images still work;
- portal and plan detail still reach delivery.

## Correction and merge rule

Runtime fixes must stay inside Block 3.1, add no dependencies/workflows/backend/cloud/WhatsApp API, and must not modify `src/main.tsx`, the dock or approved visual layers.

Only after all evidence is clean:

1. confirm PR HEAD equals the validated final SHA;
2. mark PR #11 ready;
3. merge with expected-head protection;
4. report the merge SHA;
5. formally close Block 3.1.