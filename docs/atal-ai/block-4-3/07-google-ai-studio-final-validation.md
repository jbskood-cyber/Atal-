# Block 4.3F — Google AI Studio final live validation

## Purpose

Validate the actual Gemini-backed Atal IA experience in the environment that owns `GEMINI_API_KEY`. This is the only Block 4.3F evidence that GitHub Actions cannot produce because the repository does not currently expose that secret to Actions.

## Strict rules

- Work on `feature/atal-ai-agentic-audit-block-4-3` only.
- Do not modify tracked files.
- Do not commit, push, merge, mark the PR ready or change dependencies.
- Do not print or expose `GEMINI_API_KEY`.
- Do not claim a live capability passed from deterministic mocks alone.
- Preserve the browser state until the persistence/reload checks finish.

## Environment verification

Run:

```bash
git fetch origin
git checkout feature/atal-ai-agentic-audit-block-4-3
git pull --ff-only origin feature/atal-ai-agentic-audit-block-4-3
git status --short
git rev-parse HEAD
npm_config_cache=/tmp/atal-npm-cache npm ci
npm run quality
npm run audit:ai-capabilities
npm run test:ai-live
```

Required evidence:

- clean working tree before and after validation;
- exact HEAD SHA;
- `quality` passes;
- generated matrix remains unchanged;
- live smoke prints `ATAL_AI_LIVE_SMOKE=PASS`, not `SKIPPED_NO_KEY`.

## Start the application

```bash
npm run dev
```

Open the Vite URL in the Google AI Studio preview and keep developer-console errors visible.

## Live scenario 1 — Natural read and minimal questioning

In Atal IA write:

> Resume el estado actual del paciente que estoy viendo, incluyendo su plan y las últimas sesiones. No me preguntes datos que ya estén en Atal.

Expected:

- Atal IA consults canonical tools rather than inventing data;
- it does not ask for the patient when the current context identifies one;
- the answer is natural and concise;
- no mutation occurs;
- no unsupported clinical statement is presented as fact.

## Live scenario 2 — Immediate reversible action

Write:

> Añade al expediente de este paciente la nota: toleró mejor la carga de hoy y no reportó síntomas nuevos.

Expected:

- no redundant confirmation question;
- the note is saved immediately;
- the assistant reports the actual persisted result;
- the patient profile displays the note after navigation/reload;
- Deshacer is visible and restores the previous state when used;
- the activity/audit event identifies Atal IA and the tool.

## Live scenario 3 — Multi-step request with one sensitive boundary

Write:

> Añade una nota de seguimiento, actualiza su teléfono a 4441234567 y después archiva al paciente.

Expected:

- the note and phone update execute first;
- one compact confirmation appears only before archival;
- cancelling keeps the completed safe work and leaves the patient active;
- repeating the scenario and confirming archives the patient;
- the final answer distinguishes completed and confirmed actions truthfully.

Restore the patient before continuing.

## Live scenario 4 — Ambiguous entity

Create or use two patients with similar names, then write:

> Abre el expediente de María.

Expected:

- Atal IA does not select a patient arbitrarily;
- one compact clarification presents concrete candidates;
- choosing one continues without making the user restate the whole request.

## Live scenario 5 — Recorded audio

Record a short message:

> Añade una nota al paciente actual: dolor cinco de diez después de caminar.

Expected:

- audio is recorded without Gemini Live streaming;
- transcription appears as editable text before sending;
- correcting the transcript preserves the audio artifact;
- sending follows the same immediate reversible policy as text;
- reload does not lose the conversation metadata or completed action.

## Live scenario 6 — Image-derived clinical information

Attach a small JPG or PNG and write:

> Esta imagen contiene una indicación para el paciente actual. Extrae lo compatible con Atal y prepara la actualización.

Expected:

- the model analyzes the image;
- uncertain values are not silently converted into facts;
- a single compact review appears before clinical persistence;
- cancelling saves no file-derived clinical fact;
- confirming saves only the reviewed values;
- the artifact and review state survive reload.

## Live scenario 7 — PDF-derived information

Attach a supported PDF and request that Atal prepare a record or plan update.

Expected:

- the PDF is analyzed under the same compact-review policy;
- no large data URL remains in conversation localStorage;
- the artifact is stored in IndexedDB;
- confirmed changes use canonical Atal tools and appear in the manual UI.

## Live scenario 8 — Plan and exercise multi-step work

Write:

> Crea un ejercicio de movilidad de hombro con tres series de diez repeticiones, agrégalo al plan activo y colócalo primero.

Expected:

- Atal IA completes the required tool sequence;
- the created exercise appears in the exercise library;
- the plan contains it exactly once and in the requested order;
- partial failure does not duplicate the exercise on retry;
- final text is grounded in tool results.

## Live scenario 9 — Guided session and report

Write:

> Prepara la sesión del paciente actual con dolor inicial tres de diez y energía siete de diez.

Then use Atal IA to update session progress and complete or save it as partial.

Expected:

- the canonical guided-session draft opens or resumes;
- pain, energy, effort, symptoms and exercise outcomes persist;
- session completion requires the appropriate sensitive confirmation;
- the resulting activity report is visible;
- a subsequent request can add a clinical review to the report.

## Live scenario 10 — Delivery and local effects

Write:

> Abre la entrega del plan activo y genera el PDF detallado para descargar.

Expected:

- the delivery preview opens;
- sensitive local generation/download receives the configured short confirmation;
- the PDF is generated by the canonical delivery code;
- no external message is sent;
- WhatsApp remains excluded and blocked.

## Mobile and theme regression

Validate at approximately 390 × 844:

- keyboard does not hide the composer or confirmation actions;
- the bottom navigation remains hidden where overlays require it;
- conversation, attachments and pending confirmation survive reload;
- light and dark themes remain readable;
- no white screen, fatal console error or double scroll appears.

## Required final report

Return exactly:

- validated HEAD SHA;
- clean/dirty working tree;
- `npm ci` result;
- typecheck result;
- exact Node test total and failures;
- build result;
- matrix totals and approved parity;
- live smoke output and model;
- each live scenario as PASS/FAIL/BLOCKED with concise evidence;
- console errors;
- mobile/theme result;
- any reproducible defect;
- explicit statement that PR #18 remains open, draft and unmerged.

Block 4.3F may be declared fully live-validated only when the smoke prints `PASS` and all non-excluded scenarios pass.
