# HANDOFF — Atal Block 3.1 Universal Premium Patient Delivery

## Repository state

- Repository: `jbskood-cyber/Atal-`
- Branch: `feature/atal-patient-delivery-3-1`
- Pull request: `#11`
- Base: `main`
- Base SHA at branch creation: `be1258820a3c35d437ee9ea8d7774f7eef02d7da`
- PR must remain draft and unmerged until runtime validation is complete.
- Use the current PR head as the authoritative starting SHA; verify it with `git rev-parse HEAD` after checkout.

## User-approved product decisions

1. The PDF must look premium, editorial and clinical, not like the application UI printed on paper.
2. The document must be universal and work with repetitions, seconds, minutes, distance, load, laterality, isometrics, tolerance-based dosing and long text.
3. The template adapts to the plan; the plan is never distorted to fit the template.
4. The default document is **Plan + registro**.
5. Alternative primary modes are **Solo plan** and **Solo registro**.
6. The previous detailed educational plan remains available under **Opciones avanzadas**.
7. The universal record uses one flexible field instead of dynamic series columns:
   - `Ejercicio | Indicado | Resultado real | Molestia`.
8. `Resultado real` accepts entries such as:
   - `10 / 10 / 8`;
   - `30 s / 25 s / 20 s`;
   - `12 min`;
   - `D: 10 / I: 8`;
   - `8 rep con 6 kg`;
   - `no realizado`.
9. Session tracking is selected by number of rehabilitation sessions, never by calendar weeks.
10. The application screen must be simple and follow global Atal spacing, radii, hierarchy, themes and dock.
11. WhatsApp only redirects to the saved recipient. It does not attach, upload or send the PDF. The physiotherapist decides what to attach and when to send.
12. The patient phone has priority; the responsible-contact phone is the fallback.
13. Native Share remains the flow capable of passing the actual PDF file to installed apps.
14. All PDF generation remains local and private.

## Implemented architecture

### Canonical data

`buildPatientPlanDocument.ts` still builds one immutable delivery snapshot from the saved plan. The patient snapshot now also includes:

- `phone` from `patient.contact.phone`;
- `responsibleContact` from `patient.contact.emergencyContact`.

No unsaved editor state is used.

### Options

`PatientPlanDeliveryOptions` is intentionally small:

```ts
{
  mode: 'plan-and-log' | 'plan-only' | 'log-only' | 'detailed';
  fontScale: 'large' | 'extra-large';
  includeImages: boolean;
  sessionCount: number; // normalized 1–99
}
```

This pure model is suitable for future Atal AI orchestration without reproducing a large set of UI toggles.

### Universal page estimation

`deliveryOptions.ts` owns deterministic capacities shared by UI and renderer:

- plan, large: 4 exercises first page / 6 continuation;
- plan, extra-large: 3 first / 4 continuation;
- record, large: 6 exercises per page;
- record, extra-large: 5 exercises per page.

The estimate includes:

- total pages;
- plan pages;
- log pages;
- pages per session.

Long sessions continue on another labelled page; exercise rows are never split.

### Universal PDF

`pdfUniversalRenderer.ts` generates a monochrome PDF using the existing local PDF 1.4 writer.

Plan pages contain:

- patient and real plan status;
- plan title and diagnosis/area;
- frequency and duration;
- therapeutic objective;
- exercise name;
- saved `doseLabel` without fixed assumptions;
- rest;
- key instruction, preferring therapist note and falling back to objective;
- safety and professional footer.

Session pages contain:

- numbered session;
- date and pain before/after blanks;
- universal result table;
- completed/partial/stopped result;
- perceived effort;
- observations;
- clear continuation label when required.

The PDF uses black, neutral gray, fine lines and white paper. It does not use the application green, gradients, app cards or large colored bars.

### Detailed document

`pdfRouter.ts` sends the three universal modes to `renderUniversalPatientPlanPdf` and preserves the original detailed renderer for `detailed` mode. Detailed media is loaded only when `includeImages` is explicitly enabled.

### WhatsApp

`deliveryActions.ts` adds:

- `normalizeWhatsAppPhone`;
- `resolvePatientWhatsAppTarget`;
- `patientPlanWhatsAppUrl`;
- `openPatientPlanWhatsApp`.

Behavior:

1. normalize digits and optional `00` international prefix;
2. accept 8–15 digits;
3. select patient phone first;
4. use responsible contact as fallback;
5. open `https://wa.me/<number>?text=<prepared message>`;
6. prepared message says the physiotherapist will attach the PDF next;
7. never upload or automatically send the file.

### Simplified screen

`PatientPlanDeliveryScreen.tsx` no longer has four steps or a wall of switches.

Visible controls:

- Plan + registro;
- Solo plan;
- Solo registro;
- session stepper when applicable;
- Letra grande / Letra extra grande;
- compact advanced detailed option;
- WhatsApp recipient state;
- page estimate;
- Download, Open WhatsApp, Native Share and Print.

WhatsApp is disabled when no valid contact can be resolved.

### Visual protection

`atal-patient-delivery.css` remains isolated and preserves:

- `#7EB695` for the app UI;
- no gradients;
- light and dark themes;
- existing dock and global layout;
- responsive behavior for 360–430 px;
- no `src/main.tsx` modification.

## Important changed files

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
- `docs/superpowers/specs/2026-07-21-atal-patient-delivery-3-1-design.md`
- `docs/superpowers/plans/2026-07-21-atal-patient-delivery-3-1.md`

`pdfSessionLogRenderer.ts` is a one-line compatibility re-export. The former simple renderer was removed because the universal renderer supersedes it.

## What has not been claimed

The current chat environment could not clone or execute the repository because outbound GitHub network resolution was unavailable. Therefore:

- typecheck has not been run here;
- tests have not been run here;
- build has not been run here;
- browser and mobile rendering have not been validated here;
- generated PDFs from the TypeScript renderer have not been opened here.

Do not describe the block as complete until the next environment produces evidence.

## Mandatory validation

Run:

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

Do not assume the expected test count. Report exact totals.

### Required PDF cases

1. **Strength/load/laterality**
   - 2–4 sets;
   - repetitions per side;
   - band;
   - external load;
   - different rest values.

2. **Older adult / extra-large type**
   - long patient name;
   - repetitions;
   - timed holds;
   - minutes;
   - tolerance-based activity;
   - free or as-needed rest.

3. **Mixed long plan**
   - six or more exercises;
   - long names and objective;
   - isometrics;
   - minutes;
   - distance;
   - load;
   - maximum/tolerance prescription.

For each PDF verify:

- `%PDF-1.4` signature;
- real viewer opens it;
- no fixed `3 × 10` assumptions;
- no `Serie 1 / Serie 2 / Serie 3` columns;
- dose, rest and cue come from saved data;
- wrapping and pagination are clean;
- large/extra-large text remains readable;
- no overlaps, clipping or footer collisions;
- page estimate equals actual page count;
- download, print and native share work.

### Required screen cases

Test 360, 390, 412 and 430 px in light and dark mode:

- compact global Atal metrics;
- no horizontal overflow;
- no four-step flow;
- mode selection works;
- session stepper clamps at 1 and 99;
- estimate updates;
- detailed option remains compact;
- dock remains unchanged;
- no console errors.

### Required WhatsApp cases

- patient phone only;
- responsible contact only;
- both available — patient must win;
- invalid/empty contact — button disabled;
- formatted numbers with `+`, spaces, parentheses and `00` prefix;
- correct `wa.me` URL and prepared message;
- no automatic attachment or send;
- no clinical network upload.

### Clinical regression

- active plan: actions enabled;
- draft/paused/completed: confirmation required and real status preserved;
- archived patient/plan: blocked;
- empty plan: blocked;
- missing exercise: blocked;
- detailed plan and optional local images still work;
- portal and plan-detail links still reach the delivery route.

## Correction rules

When validation finds an issue:

- fix only the root cause inside Block 3.1;
- do not add dependencies, workflows, backend, cloud storage or WhatsApp API;
- do not reduce type to hide overflow;
- do not modify `src/main.tsx`, dock or approved visual layers;
- keep PR #11 and the same branch;
- use one final correction commit after grouping validation fixes;
- rerun typecheck, full tests and build.

## Merge rule

Only after all evidence is clean:

1. confirm PR head SHA is the validated SHA;
2. mark PR #11 ready for review;
3. merge with the expected-head guard;
4. report the final merge SHA;
5. formally close Block 3.1.

## Paste-ready prompt for the next chat

```text
Continue Atal Block 3.1 from the repository handoff:
docs/handoffs/2026-07-21-atal-block-3-1-universal-delivery.md

Repository: jbskood-cyber/Atal-
Branch: feature/atal-patient-delivery-3-1
PR: #11

Read the handoff, spec, implementation plan and QA document before changing code.
Do not work on main and do not merge yet.

First verify the current branch SHA, then run:
npm ci
npm run typecheck
npm test
npm run build
npm run dev

Validate the three universal PDF cases, the simplified screen at 360–430 px in both themes, patient/responsible WhatsApp fallback, download, native share, print, console and Network privacy.

Fix only real Block 3.1 defects. Do not add dependencies, workflows, backend, public links, automatic WhatsApp attachment or sending. Do not modify src/main.tsx, dock, approved visual layers or green #7EB695.

Return exact command results, test totals, final SHA, page counts, screenshots, PDF evidence, WhatsApp behavior, corrections and any blocker. Only after every check passes may PR #11 be marked ready and merged with the validated expected head SHA.
```
