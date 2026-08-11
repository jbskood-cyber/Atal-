# Atal Final Polish & Exhaustive Agent QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a compact Linear-like Atal IA experience and exhaustively recertify the physiotherapist workflow with real Gemini without regressing the certified Action Core.

**Architecture:** Keep all existing agent/draft/domain state and safety machinery. Change presentation boundaries first, then add deterministic data-hygiene guards only where a reproducible RED proves contamination. Finish with one focused real-Gemini plan matrix and one complete physiotherapist flow checkpoint.

**Tech Stack:** React, TypeScript, CSS, Playwright/Chromium, Node tests, GitHub Actions, `@google/genai`.

## Global Constraints
- Baseline is `6a1258b91353ed843d2d0501ba3c2519a393f7bc`; no regression of 26/26 live matrix.
- Work only on `feature/atal-final-polish-agent-qa`; never `main`.
- Keep PR #20 open/draft/unmerged.
- Preserve Action Core, `atal:store:v2`, audit, Undo and global/contextual isolation.
- No full live run per commit; only high-value checkpoints.
- Synthetic clinical data only.

---

### Task 1: Simplify contextual assistant presentation

**Files:**
- Modify: `src/features/atal-ai/contextual/ContextualAIWorkspace.tsx`
- Create: `src/styles/atal-final-polish-agent.css`
- Modify: `src/main.tsx`
- Test: `e2e/atal-final-polish-contextual.spec.mjs`

**Interfaces:**
- Consumes: `useContextualConversation`, hidden draft state, `model.apply`, `model.undo`, contextual isolation.
- Produces: text-first contextual surface with one compact approval/result path.

- [ ] Write an E2E RED that asserts suggestion cards, visible draft tab and own-message timestamps are absent while conversation and confirmation remain reachable.
- [ ] Run the focused E2E and confirm RED.
- [ ] Remove visible contextual action/suggestion/draft chrome without deleting draft state or confirmation execution.
- [ ] Add compact CSS overrides for header, conversation, user bubble, composer and result card.
- [ ] Run focused E2E until GREEN.
- [ ] Run Behavior + quality + E2E regression belts.
- [ ] Commit.

### Task 2: Simplify general Atal IA chat

**Files:**
- Modify the existing general assistant screen/component that renders `.atal-command-thread` and `ConversationalDraftCard`.
- Modify: `src/styles/atal-final-polish-agent.css`
- Test: `e2e/atal-final-polish-general-chat.spec.mjs`

**Interfaces:**
- Consumes: existing streaming text, draft/confirmation state and savedResult/Undo.
- Produces: clean assistant prose, intrinsic user bubbles, compact composer, one `Aplicar cambios` approval affordance.

- [ ] Locate exact general-chat renderer from branch source.
- [ ] Write RED assertions for no visible “Acción preparada”/percentages, no own-message time, compact composer and streaming text.
- [ ] Implement presentation-only simplification while retaining internal draft state.
- [ ] GREEN focused E2E and regression belts.
- [ ] Commit.

### Task 3: Fix empty-plan visual duplication

**Files:**
- Modify: `src/screens/PatientProfileScreen.tsx` and/or the current active-plan empty-state component.
- Test: `e2e/atal-final-polish-empty-plan.spec.mjs`

**Interfaces:**
- Produces exactly one compact no-active-plan state and one create-plan affordance.

- [ ] Write RED asserting a patient with no active plan sees one create-plan CTA.
- [ ] Remove duplicated empty state/spacing source.
- [ ] GREEN focused E2E and regression belts.
- [ ] Commit.

### Task 4: Data-hygiene RED matrix

**Files:**
- Create: `tests/atal-ai-structured-field-hygiene.test.mjs`
- Modify only the exact normalizer/tool mapping files implicated by REDs.

**Interfaces:**
- Produces field-safe canonical values without changing domain semantics.

- [ ] Add RED cases for narrative-prefixed patient names, instructions mixed with dose, frequency text leaking into goal, and precautions leaking into instructions.
- [ ] Run tests and classify which failures are actual current behavior.
- [ ] For each real RED, implement the smallest request/tool normalization fix; never rewrite valid free-text clinical notes.
- [ ] GREEN tests + Behavior/quality/E2E.
- [ ] Commit.

### Task 5: Exhaustive deterministic plan QA

**Files:**
- Create/extend deterministic and browser plan tests under `tests/` and `e2e/`.

**Coverage:** create, update fields, membership, replace exercise, lifecycle, duplicate protection, wrong-patient protection, ambiguity, pronouns/context, reload/readback.

- [ ] Add missing REDs without changing existing green expectations.
- [ ] Fix only reproducible product REDs using TDD.
- [ ] Run complete deterministic belts.
- [ ] Commit.

### Task 6: Real-Gemini plan checkpoint

**Files:**
- Create: `e2e/live-gemini-plan-exhaustive.spec.mjs`
- Modify live workflow only to include this suite in the single milestone checkpoint.

- [ ] Use natural Spanish prompts and synthetic patients.
- [ ] Verify each mutation through Action Core/store/UI/reload and exact readback.
- [ ] Run one provider preflight.
- [ ] Run one NO-SKIPPED live checkpoint.
- [ ] Classify provider/harness/product failures from artifacts.
- [ ] Convert only product failures to REDs and repair before rerun.

### Task 7: Complete physiotherapist-flow checkpoint

**Files:**
- Create: `e2e/live-gemini-physio-workflow.spec.mjs`

- [ ] Execute patient → record → plan → exercises → session → report → query → edit → Undo → reload.
- [ ] Assert structured field hygiene in canonical state.
- [ ] Assert no cross-patient/context contamination.
- [ ] Re-run one final live milestone only after deterministic belts are green.
- [ ] Record exact PASS/FAIL evidence.

### Task 8: Closeout and operational tracking

**Files:**
- Update PR body / docs as appropriate.
- Update Google Sheet ESTADO/ROADMAP/REGISTRO/HALLAZGOS.

- [ ] Confirm current HEAD and all four belts.
- [ ] Confirm visual mobile E2E evidence.
- [ ] Confirm live plan + physiotherapist-flow evidence.
- [ ] Keep PR draft unless product owner explicitly approves review/landing.
- [ ] Record remaining production-readiness items separately from agent functionality.
