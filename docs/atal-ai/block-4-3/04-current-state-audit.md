# Block 4.3 — Current-state agentic audit

## Canonical state

- Base SHA: `6d9fd28bad4ae6f8cddcb4d0e11d3b36cd0d96ea`
- Store: `atal:store:v2`, version `2`
- Current orchestration: one-shot structured draft or command generation
- Current execution: deterministic Block 4.1 registry, policy, transaction, audit and undo engine
- Contextual surface: Block 4.2 global assistant workspace

## Measured parity

The machine-validated inventory contains **62** manual capabilities:

- fully covered: **19**;
- partial: **12**;
- missing: **26**;
- deliberately excluded: **5**;
- current strict full-parity percentage: **31%**.

Partial capabilities do not count as complete. A similarly named intent or command is not evidence of equivalent persistence, context, safety, audit, undo or client behavior.

## What works today

The existing deterministic core already covers these important groups:

- patient search through `patient.search`;
- combined patient, initial record and plan creation through `patient.create_with_record_and_plan`;
- adding patient notes through `patient_note.add`;
- updating the current clinical record through `patient_record.update`;
- plan creation and updates through `plan.create_for_patient` and `plan.update`;
- plan lifecycle through `plan.activate`, `plan.pause`, `plan.complete`, `plan.archive`, `plan.restore` and `plan.replace_active`;
- exercise creation and update through `exercise.create` and `exercise.update`;
- preparing a session summary through `report.prepare_session_summary`;
- local patient, progress and plan exports through `data.export_local`;
- approved privacy and Atal IA preference changes through `settings.update`;
- opening Atal IA with current route context through the Block 4.2 contextual workspace.

These operations use the canonical local store and the Block 4.1 execution boundary rather than allowing Gemini to mutate state directly.

## What is only partial

The following capabilities have an existing path but are not equivalent to their manual outcome:

- patient detail omits complete contact, notes, record versions and session history;
- demographic updates cover only the fields represented by the legacy draft;
- clinical record reads are incomplete;
- record creation exists only inside combined patient creation;
- plan detail exposes only a limited active-plan summary;
- plan update lacks explicit membership removal and ordering semantics;
- adding plan exercises is implicit rather than a dedicated membership operation;
- activity and report reads return abbreviated summaries;
- professional profile and appearance are not fully represented by the settings tool;
- conversation persistence does not yet persist bounded multi-step checkpoints or durable attachment artifacts.

## What is missing

### Universal read model

Typed reads are missing for complete patient state, contacts, complete records and versions, plan lists and details, exercise lists and details, active session preparation, complete reports, audit history, settings and delivery state.

### Canonical actions

Missing actions include patient contact and lifecycle updates, note editing, plan duplication and membership ordering, exercise duplication/archive/media, guided-session state and completion, report review, professional profile/theme updates and approved delivery client effects.

### Agent orchestration

The current server produces one JSON draft or one fixed command. It does not yet run a bounded function-calling loop, select dynamic tool subsets, execute several safe steps, pause only at a sensitive boundary, resume from checkpoints, prevent duplicate calls or produce a final answer grounded in all tool results.

### Durable multimodal artifacts

The current interface can submit images, PDFs and audio, but conversation persistence stores metadata with `available: false`; attachment data and derived proposals are not durable after reload. Recorded audio is batch-transcribed, which is the approved cost-conscious direction, but the audio artifact and transcript lifecycle require stronger persistence.

### Client effects

Navigation, delivery PDF generation, printing and sharing are not represented as approved deterministic client effects in the core contract.

## Deliberate exclusions

The current block deliberately excludes:

- permanent patient-note deletion;
- permanent plan deletion;
- permanent exercise deletion;
- automatic WhatsApp or other external messaging;
- external feedback sharing as part of the clinical agent parity target.

These exclusions do not reduce the completion target: Block 4.3 reaches full approved parity when every non-excluded capability is covered.

## Product conclusion

Atal IA is currently a **documentation assistant with deterministic actions and partial agentic behavior**. It is not yet a universal agentic assistant.

The architecture is a strong foundation because state mutation, risk, audit and undo remain deterministic. The next work must expand typed read/action parity and add bounded function-calling orchestration without weakening that boundary.
