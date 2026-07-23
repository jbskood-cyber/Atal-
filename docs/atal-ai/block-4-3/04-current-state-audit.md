# Block 4.3 — Final agentic architecture audit

## Canonical state

- Base SHA: `6d9fd28bad4ae6f8cddcb4d0e11d3b36cd0d96ea`
- Protected clinical store: `atal:store:v2`, version `2`
- Deterministic authority: Block 4.1 registry, policy, transaction, audit and undo engine
- Contextual surface: Block 4.2 global assistant workspace
- Primary assistant route: `/assistant`
- Model boundary: Gemini function calling through the server-side `/api/atal-ai/agent-turn` endpoint
- Voice approach: recorded audio and editable transcription; Gemini Live is deliberately excluded

## Measured parity

The machine-validated inventory contains **62** manual capabilities:

- approved in-scope capabilities: **57**;
- approved capabilities covered: **57**;
- partial: **0**;
- missing: **0**;
- deliberately excluded: **5**;
- total matrix coverage including exclusions: **92%**;
- approved agentic parity: **100%**.

The five exclusions remain visibly blocked for product, clinical-retention or external-integration reasons. They are not hidden implementation gaps.

## Universal minimum-context reads

`app.read` provides typed, bounded views for:

- complete patient context, contact, notes, plans and sessions;
- clinical records and version history;
- plan lists, plan detail and ordered exercises;
- exercise search and detail;
- guided-session preparation;
- sessions, complete reports and activity/audit history;
- settings and professional profile;
- delivery state.

The full clinical store is never automatically inserted into the Gemini prompt. Gemini requests only the exact read resource needed for the current turn.

## Universal deterministic actions

Atal IA can reach the canonical outcomes for:

- patient creation, demographics, contacts and archive/restore;
- note creation and editing;
- clinical-record creation, update and versioning;
- plan creation, editing, duplication, lifecycle, atomic replacement, membership and ordering;
- exercise creation, editing, duplication, lifecycle and reviewed local media;
- guided-session preparation, progress, symptoms, completion and partial save;
- report review;
- professional profile, privacy, AI preferences and appearance;
- internal navigation;
- delivery preview, local PDF generation, download, share and print;
- local exports.

Gemini never mutates storage directly. Each action is validated and executed by Atal application code.

## Hybrid autonomy

The policy layer implements the approved behavior:

- read operations execute immediately;
- an explicit, unambiguous reversible request is sufficient authorization;
- file-derived clinical changes stop at one compact review;
- sensitive writes require a short explicit confirmation;
- destructive or unavailable external actions remain blocked;
- several safe steps execute before the first sensitive boundary;
- completed work is preserved when the task pauses;
- validated reversible transactions expose Deshacer.

Risk classification remains owned by registered Atal tool definitions, never by the model.

## Bounded conversation orchestration

The agent loop includes:

- dynamic context-relevant tool selection capped at 20 active tools;
- a maximum of eight model/tool rounds per task;
- allowlist enforcement;
- argument validation and deterministic entity resolution;
- duplicate-call detection;
- persisted task history, completed steps and pending call;
- resumable confirmation after navigation or reload;
- cancellation and maximum-step termination;
- final responses grounded in actual tool results.

Atal IA now behaves as an operational assistant rather than a fixed one-shot intent router.

## Durable multimodal behavior

- Audio is recorded, persisted locally, transcribed in batch and returned as editable text.
- Images, PDFs and audio blobs are stored in IndexedDB rather than indefinitely in conversation localStorage.
- Artifact identity, transcript, proposal status and linked result survive reload.
- File-derived clinical facts require compact review before persistence.
- Exercise images use the existing canonical exercise-media repository.
- Text, reviewed audio and reviewed files enter the same deterministic agent workflow.

## Client effects

Approved device-side effects are represented by typed application contracts:

- internal navigation;
- theme changes;
- guided-session draft operations;
- local exercise media persistence;
- local delivery actions;
- local downloads.

Client effects are executed by application code after the policy boundary. They are not arbitrary model instructions.

## Deliberate exclusions

Block 4.3 deliberately excludes:

- permanent patient-note deletion;
- permanent plan deletion;
- permanent exercise deletion;
- automatic WhatsApp or other external messaging;
- external feedback sharing as part of the clinical agent target.

## Product conclusion

Within the approved local MVP scope, Atal IA is now implemented as a **universal bounded agentic assistant** with complete manual-to-AI capability parity.

It remains intentionally local-first. Authentication, cloud clinical synchronization, multi-user operation, payments and autonomous diagnosis were not silently introduced by this block.
