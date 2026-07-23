# Block 4.3 — Gap disposition and implementation order

## Plan 4.3B — Universal minimum-context read model

Build typed reads that return only the information required for the current request, without placing the full clinical store in the model prompt.

Entry condition: verified 62-row capability matrix.

Exit condition: every approved read-only manual capability is represented by a registered deterministic read tool.

Capability IDs:

- `patient.read`
- `clinical-record.read`
- `clinical-record.read-history`
- `plan.list-search`
- `plan.read`
- `exercise.list-search`
- `exercise.read`
- `session.prepare`
- `report.list`
- `report.read`
- `activity.read-audit`
- `delivery.preview`
- `settings.read`

Existing read tools remain available when they are already complete.

## Plan 4.3C — Universal deterministic action registry

Build missing canonical action tools and approved client effects. Every mutation must validate input, resolve entities, enforce risk in application code, persist through the canonical state, write audit evidence and provide validated undo when the underlying operation supports it.

Entry condition: 4.3B read model complete.

Exit condition: every approved manual mutation has an equivalent deterministic AI path.

Capability IDs:

- `patient.update-demographics`
- `patient.update-contact`
- `patient.archive-restore`
- `patient-note.update`
- `clinical-record.create`
- `plan.update`
- `plan.duplicate`
- `plan.add-exercises`
- `plan.remove-exercises`
- `plan.reorder-exercises`
- `exercise.duplicate`
- `exercise.archive-restore`
- `session.start-resume`
- `session.record-exercise-result`
- `session.record-symptoms`
- `session.complete`
- `report.review`
- `delivery.configure`
- `delivery.generate-pdf`
- `delivery.download-print-share`
- `settings.update-profile`
- `settings.update-appearance`
- `navigation.open-screen`

`exercise.update-media` is completed in 4.3E because its canonical result depends on durable attachment storage.

## Plan 4.3D — Bounded agentic orchestration and durable task memory

Replace the fixed one-shot intent router for normal conversation with server-side Gemini function calling and a client-side bounded execution loop.

The loop must:

- expose only a small context-relevant tool subset;
- execute deterministic Atal tools on the client;
- run safe explicit reversible instructions immediately;
- pause only for sensitive operations or file-derived clinical facts;
- group indispensable clarification into one compact request;
- persist completed steps, pending calls, confirmations and results;
- prevent duplicate execution through call IDs and idempotency keys;
- stop on completion, cancellation, repeated calls, timeout or maximum steps;
- produce a natural final response grounded in actual tool results.

Entry condition: read and action registries complete.

Exit condition: representative single-step and multi-step text requests pass deterministic orchestration tests and a live Gemini smoke test when a key is available.

Capability IDs directly closed here:

- `assistant.resume-task`

This plan also makes every already-covered or newly built tool naturally accessible from conversation rather than only through the legacy fixed intent map.

## Plan 4.3E — Durable recorded-audio, image and PDF artifacts

Persist attachment identity, binary content in the approved local media repository, transcript state, extracted proposal, uncertainty and final linked result.

Rules:

- recorded audio remains batch transcription; Gemini Live is excluded;
- the transcript is editable before sending;
- text and reviewed audio use the same agent policy;
- image/PDF-derived clinical changes require one compact review;
- retry and reload do not discard the artifact or repeat completed mutations;
- large data URLs are not stored indefinitely in conversation localStorage.

Entry condition: orchestration checkpoints persist.

Exit condition: recorded audio, images and PDFs survive reload and execute through the same deterministic tools as text.

Capability IDs directly closed here:

- `exercise.update-media`

This plan also closes multimodal durability for all non-excluded capabilities marked with image or PDF relevance.

## Plan 4.3F — Full product parity validation and MVP readiness

Execute the complete 62-row matrix manually and through Atal IA. Close reproducible gaps, verify exclusions, and produce final evidence.

Required validation:

- clean install;
- typecheck;
- complete Node test suite;
- production build;
- capability-report regeneration without diff;
- deterministic Playwright regression for Blocks 4.1 and 4.2;
- new agent single-step and multi-step E2E flows;
- reload and interruption recovery;
- immediate low-risk execution;
- sensitive confirmation boundaries;
- audit and undo integrity;
- recorded-audio, image and PDF flows;
- mobile viewport, keyboard and both Atal themes;
- live Gemini smoke test when `GEMINI_API_KEY` is available.

Exit condition:

- every one of the **57 non-excluded capabilities** is classified `covered`;
- the five exclusions remain explicit and blocked;
- strict approved-parity percentage is **100%**;
- no runtime success claim is made without persisted tool evidence;
- PR remains open, draft and unmerged until explicit user authorization.

## Fixed exclusions

The following capability IDs remain excluded from implementation in Block 4.3:

- `patient-note.delete`
- `plan.delete-safe`
- `exercise.delete-safe`
- `delivery.prepare-whatsapp`
- `feedback.prepare-share`
