# Atal Final Polish & Exhaustive Agent QA — Design

## Goal
Polish Atal's AI surfaces into a compact, text-first, Linear-like operational experience while preserving the already-certified Behavior System, Action Core, atal:store:v2 persistence, contextual isolation, confirmation safety, audit and Undo semantics.

## Baseline that must not regress
Certified baseline: `feature/atal-behavior-system@6a1258b91353ed843d2d0501ba3c2519a393f7bc` with live Gemini + Chromium 26/26 PASS, quality #904 PASS, Behavior #475 PASS, E2E #880 PASS, plus Google AI Studio sanity 16/16 PASS.

## UX contract
1. General Atal IA and contextual assistants are text-first conversational surfaces.
2. Assistant responses render as clean text with headings/lists only when useful; no green message cards around assistant prose.
3. User bubbles keep current typography but shrink to intrinsic content size with tighter padding and no visible timestamp.
4. The composer shrinks roughly 25–30%; send/mic/+ controls become smaller while preserving touch accessibility and Android keyboard safety.
5. Visible draft chrome is removed: no “Acción preparada”, completion percentages, suggestion cards, or visible “Borrador” tab.
6. Draft/confirmation machinery remains internal so safety, conflict handling, Action Core and Undo are not bypassed.
7. When a mutation needs approval, show one compact `Aplicar cambios` action. After success, show a compact collapsible `Cambios aplicados` result with Undo/details only when relevant.
8. Contextual assistant reduces to compact header + fixed context + conversation + composer. Extra actions are available only through an overflow/menu affordance when needed.
9. Empty states are compact and singular. “Plan activo” without a plan must show one clear create-plan affordance, never duplicated.
10. Mobile density, spacing, radii and hierarchy must remain consistent with Atal Native Clinical rather than introducing a new visual system.

## Data-hygiene contract
Structured AI writes must contain only field-appropriate values. Examples: patient.name=`Francisco`, not narrative prefixes; exercise.instructions contains instructions only; dose/frequency/precautions stay in their own fields. Patient, clinical record, plan and exercise paths are covered by deterministic regression tests before any production normalization change.

## QA contract
### Visual
Playwright mobile viewport validation for general chat and contextual assistant. Verify compact user bubble, hidden own-message time, compact composer, text-first assistant, absence of visible draft/suggestion chrome, and reachable confirmation/result controls.

### Functional
Maintain quality + Behavior System + E2E green. Any behavioral change follows exact RED → minimal fix → GREEN.

### Live Gemini
Use one high-value real-Gemini checkpoint per meaningful milestone rather than per commit. Priority matrix:
- create plan for existing patient from natural language;
- create from fresh conversation;
- duration/frequency/goal exactness;
- associate suggested exercises;
- edit dose and replace exercise;
- update frequency/duration/goal;
- valid lifecycle transitions;
- duplicate and wrong-patient protection;
- ambiguity and pronoun/context handling;
- reload persistence and exact canonical readback.

Final physiotherapist flow: patient → record → plan → exercises → session → metrics → complete → report → query → edit → Undo → reload.

### Red-team
Field contamination, similar patient names, nonexistent plans, incomplete commands, multi-action, context switching, contextless confirmation, provider failure before/after successful tool execution, 400/404/429 fallback, long/short/noisy messages, non-hallucination.

A capability counts only when natural prompt → real Gemini/tool or internal draft → Action Core → atal:store:v2/real effect → readback/reload/UI.

## Architecture boundaries
- Do not replace or bypass Action Core.
- Do not delete draft state models solely because draft chrome disappears.
- Do not merge transcript/session state between global and contextual assistants.
- Do not mutate `main` or PR #20.
- Work on `feature/atal-final-polish-agent-qa` stacked from the certified candidate.
