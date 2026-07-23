# Block 4.3 — Global and contextual assistant separation

## 1. Correction authority

This document records the product correction authorized by the product owner after real mobile evidence showed that the global Atal IA experience had been replaced and contextual conversations were leaking into the global assistant.

This contract overrides any implementation interpretation that treats the global assistant and a contextual assistant as the same conversation instance.

## 2. Product invariant

Atal has two assistant experiences that share one safe execution core but never share an implicit conversation instance.

### 2.1 Global assistant

Route: `/assistant`.

The global assistant:

- can consult and operate every approved Atal capability;
- supports ordinary natural conversation;
- preserves the full structured workspace that existed before Block 4.3;
- displays the conversation and a reviewable draft when structured work is requested;
- retains suggestions, real progress, collapsible sections, `Revisar todo`, `Aplicar cambios`, confirmation, audit and Undo;
- owns only conversations whose scope is `global`;
- must never select a contextual conversation merely because it was updated more recently.

The universal agent is integrated into this workspace. It does not replace the workspace.

### 2.2 Contextual assistant

A contextual assistant is opened from a patient, clinical record, plan, exercise, session or report surface without changing the current clinical route.

A contextual assistant:

- is limited to the entity and surface where it was opened;
- owns a separate conversation identified by an exact contextual key;
- restores only that contextual conversation when reopened on the same entity;
- cannot appear in the global conversation list;
- cannot silently copy its transcript into another contextual assistant or the global assistant;
- uses only the tool subset authorized for its current context.

## 3. Shared and separated architecture

The following are shared:

- Gemini boundary;
- deterministic tool registry;
- risk policy;
- validation;
- transactions;
- canonical persistence through `atal:store:v2`;
- audit;
- Undo.

The following are separated:

- conversation identity;
- history;
- draft identity unless explicitly copied;
- attachments;
- composer state;
- pending task state;
- selected contextual entity;
- conversation lists.

Sharing the execution core does not authorize sharing session state.

## 4. Persistence and migration

Every persisted conversation has an inferred or explicit scope:

```ts
scope: 'global' | 'contextual'
```

Migration rule for existing local data:

- a conversation containing `contextKey` or `contextSurface` is contextual;
- a legacy conversation without contextual metadata is global;
- existing drafts and messages are preserved;
- no clinical data is rewritten during migration.

Global repositories select only global conversations. Contextual repositories select only the exact contextual key.

## 5. Contextual identity

Contextual identity must be derived from the canonical surface and entity references, including the identifiers necessary to prevent collisions between different patients, plans, exercises, records, sessions or reports.

Changing the contextual entity changes the contextual conversation. Two different patients cannot share one contextual transcript.

## 6. Explicit handoff

The only supported connection from a contextual assistant to the global assistant is an explicit user action such as:

```text
Abrir Atal IA completa
```

The handoff creates a new global conversation and may carry:

- canonical entity references;
- the entity label;
- a concise continuation prompt;
- a cloned structured draft when one exists.

The handoff must not carry:

- the contextual conversation ID as the new global ID;
- the complete contextual transcript;
- unrelated patient context;
- transient confirmation state;
- hidden model history.

The contextual conversation is persisted before navigation and remains available only in its original contextual instance.

## 7. Global routing behavior

The global assistant chooses between two internal presentation modes without changing product identity.

### Natural agent mode

Used for:

- ordinary conversation;
- questions and explanations;
- read operations;
- direct explicit actions;
- descriptive image or PDF questions;
- multi-step agentic work.

### Structured draft mode

Used for:

- explicit plan, patient or exercise drafting;
- requests for a reviewable structured proposal;
- continued editing of an existing draft;
- file-derived clinical data that requires review before persistence.

A structured draft remains visible in the global workspace until applied, discarded or intentionally replaced.

## 8. Required regression coverage

The implementation cannot be declared complete unless automated tests prove all of the following:

1. A newer contextual conversation cannot replace the latest global conversation.
2. Global history excludes contextual conversations.
3. Two contextual entity keys resolve to different sessions.
4. Natural global conversation retains multi-turn history.
5. Structured global work displays the full reviewable draft workspace.
6. A descriptive image question does not expose mutation tools automatically.
7. Explicit reversible actions still persist, audit and expose Undo.
8. Sensitive actions still pause for confirmation and survive reload.
9. Explicit handoff creates a new global session and preserves the source contextual session.
10. Handoff does not copy the complete contextual transcript.
11. Mobile rendering remains readable at approximately 390 × 844 px.
12. `main` remains untouched until explicit merge authorization.

## 9. Deterministic evidence

Validated implementation HEAD:

```text
7938bbdda5160facf3f37f7e0923d0d109cf4b75
```

Validated contract HEAD before this evidence-only freeze commit:

```text
3c20d5dfb0c441045a882a8edd009d71ee4947b6
```

Evidence:

- clean dependency installation: passed;
- TypeScript typecheck: passed;
- complete Node suite: 156 passed, 0 failed;
- production build: passed;
- generated capability matrix verification: passed;
- Playwright: 39 passed, 0 failed, 0 flaky, 0 skipped;
- quality workflow: `30048894581` passed;
- E2E workflow: `30048894597` passed.

A fresh real-device Google AI Studio walkthrough remains mandatory because deterministic coverage cannot prove Gemini response quality or the final visual experience on the product owner's device.

## 10. Prohibited regressions

The following are product failures:

- replacing the global assistant screen with a reduced contextual or agent-only screen;
- loading `getLatest` across mixed conversation scopes;
- showing contextual messages in global history;
- making text entered on one clinical screen appear in another assistant instance;
- allowing contextual tools outside the current entity scope;
- transferring context without an explicit user action;
- removing the global structured draft in order to add agentic behavior.
