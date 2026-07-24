# Atal Linear-Style Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Atal IA as a natural, persistent, tool-using agent inspired by Linear Agent while preserving Atal's deterministic safety, isolated contextual sessions, structured draft workflow, audit, confirmation, and Undo.

**Architecture:** Gemini 3.6 Flash remains the conversational brain. Each turn may answer directly or request typed Atal tools; Atal alone validates, executes, persists, audits, confirms, and creates Undo receipts. The general assistant and contextual assistants keep independent conversations and interaction state. The UI streams assistant text, formats generated content, styles user messages with the Atal green surface, and renders the structured draft only when reviewable content exists.

**Tech Stack:** React 19, TypeScript 5.9, Vite 6, `@google/genai` 2.4, Gemini 3.6 Flash, local canonical Atal store, Node test runner, Playwright.

## Global Constraints

- Work only on `feature/atal-ai-linear-agent`, based on `f12fadede8fe1badd5ae16e64d1fdf2b2cc676d9`.
- Do not modify `main`, PR #18, or the Block 4.3 canonical branch.
- No predefined answer catalogue; Gemini generates conversational responses.
- No direct model mutation, model-selected risk, or autonomous diagnosis.
- Preserve `atal:store:v2`, migrations, global/contextual separation, audit, confirmations, and Undo.
- The structured draft appears only when reviewable draft content exists.
- User messages use Atal green with white text; assistant content supports safe rich formatting.
- Assistant output must stream progressively.

---

### Task 1: Natural turn semantics

**Files:**
- Modify: `src/features/atal-ai/core/agentic/generalTurnMode.ts`
- Modify: `src/features/atal-ai/core/agentic/toolSelection.ts`
- Test: `tests/atal-ai-general-turn-mode.test.mjs`

- [ ] Add failing tests for conceptual conversation, workspace reads, proposals, and explicit actions.
- [ ] Verify CI fails because `classifyAgentTurn` does not exist.
- [ ] Implement semantic safety classification used only to constrain tool authorization.
- [ ] Keep Gemini as the response generator and decision-maker within allowed tool kinds.
- [ ] Verify focused and full Node suites pass.

### Task 2: Precise tool contracts and recoverable errors

**Files:**
- Modify: `src/features/atal-ai/api/agentToolCatalog.ts`
- Modify: `server/atalAIAgent.ts`
- Modify: `src/features/atal-ai/core/agentic/agentLoop.ts`
- Create: `src/features/atal-ai/core/agentic/agentErrors.ts`
- Test: `tests/atal-ai-agent-loop.test.mjs`
- Test: `tests/atal-ai-universal-read-tools.test.mjs`

- [ ] Add failing tests for invalid read input returning a repairable tool result without mutation.
- [ ] Define precise JSON schemas for every exposed tool, including valid `app.read.resource` values.
- [ ] Return validation failures to Gemini once for self-repair.
- [ ] Prevent duplicate invalid calls and translate internal codes into product language.
- [ ] Verify tool safety and regression suites.

### Task 3: Stateful interactions and streaming

**Files:**
- Create: `server/atalAIInteraction.ts`
- Modify: `server/atalAIAgent.ts`
- Modify: `src/features/atal-ai/api/geminiClient.ts`
- Modify: `src/features/atal-ai/core/agentic/contracts.ts`
- Modify: `src/features/atal-ai/types.ts`
- Test: `tests/atal-ai-agent-loop.test.mjs`

- [ ] Add failing tests for persisted per-conversation interaction IDs and streamed text accumulation.
- [ ] Use Gemini Interactions API with `previous_interaction_id` when available.
- [ ] Stream model output and observable step events to the client.
- [ ] Preserve a stateless fallback when interaction state expires.
- [ ] Keep separate interaction IDs for every global and contextual conversation.

### Task 4: Natural agent controller

**Files:**
- Modify: `src/features/atal-ai/agent/agentController.ts`
- Modify: `src/features/atal-ai/core/agentic/agentLoop.ts`
- Modify: `src/features/atal-ai/api/agentPrompt.ts`
- Test: `tests/atal-ai-agent-loop.test.mjs`
- Test: `tests/atal-ai-conversation-scope.test.mjs`

- [ ] Add multi-turn tests for direct answers, read calls, proposals, actions, ambiguity, and follow-up references.
- [ ] Feed conversation context, screen context, draft state, and tool results into each interaction.
- [ ] Execute safe operations immediately and pause only at deterministic boundaries.
- [ ] Preserve contextual tool allowlists and explicit contextual-to-global handoff.

### Task 5: Conditional draft and streamed presentation

**Files:**
- Modify: `src/features/atal-ai/AtalAIGeneralScreen.tsx`
- Modify: `src/features/atal-ai/components/ConversationalDraftCard.tsx`
- Create: `src/features/atal-ai/components/AssistantMessageContent.tsx`
- Modify: `src/styles/atal-ai-agentic-chat.css`
- Modify: `src/styles/atal-ai-agentic.css`
- Test: `e2e/block-4-3-conversation-regressions.spec.mjs`

- [ ] Add failing E2E assertions for conditional draft placement, green user messages, formatted assistant text, and progressive output.
- [ ] Render the draft between thread and composer only when a reviewable draft exists.
- [ ] Style user messages with the established Atal green and white text.
- [ ] Render safe paragraphs, headings, lists, emphasis, and code without unsafe HTML.
- [ ] Display streamed assistant output progressively with accessible live regions.
- [ ] Verify mobile 390×844, keyboard, themes, and no horizontal overflow.

### Task 6: Full verification and publication

**Files:**
- Modify: `docs/atal-ai/block-4-3/` only if evidence needs a new experimental report.

- [ ] Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run audit:ai-capabilities`, and relevant Playwright suites.
- [ ] Run the real Gemini smoke in the environment that owns `GEMINI_API_KEY`.
- [ ] Verify conceptual chat, canonical reads, proposals, actions, confirmation, audit, Undo, multimodal inputs, contextual isolation, and explicit handoff.
- [ ] Publish only to `feature/atal-ai-linear-agent` and keep any PR in draft.
- [ ] Present the exact SHA and visual validation instructions to Josue.
