# Atal Functional Foundation Design

## Goal

Convert the approved visual build of Atal into a safe, coherent local clinical application before adding PDF delivery, remote backend, authentication, landing pages, or payments.

## Source of truth

- Repository: `jbskood-cyber/Atal-`
- Base branch: `main`
- Approved base commit: `8dba87df94926aa39d7741961d540323ec931874`
- Working branch: `feature/atal-functional-foundation`
- Canonical application entry: `src/main.tsx` → `AppCloseout`
- Canonical local store: `atal:store:v2`

## Non-negotiable visual constraints

The approved Atal Native Clinical visual system is frozen for this block.

- Preserve the six final stylesheet layers imported by `src/main.tsx`.
- Preserve official green `#7EB695`.
- Preserve the approved mobile dock and Atal IA presentation.
- Do not reintroduce gradients.
- Do not rebuild the application or replace the current navigation architecture.
- Functional changes must fit the existing visual components and interaction patterns.

## Scope

### 1. Canonical application tree

Atal must have one executable route tree and one canonical implementation of each functional screen. `AppCloseout` remains the active application. Obsolete parallel route wiring must be removed or reduced to a compatibility re-export so developers cannot accidentally modify unused screens.

### 2. Quality gate

Add a repeatable automated quality gate using Vitest and React Testing Library. The repository must expose:

- `npm test`
- `npm run test:run`
- `npm run typecheck`
- `npm run build`

A GitHub Actions workflow must run install, typecheck, tests, and build for pull requests and pushes to `main`.

### 3. Real data versus demo data

A fresh production-style local workspace must not silently seed demo patients, plans, exercises, sessions, or events. Demo content must be created only through an explicit demo initializer. Existing users with `atal:store:v2` must keep their data unchanged.

### 4. Clinical relationship integrity

Creating or duplicating a draft plan must not replace the plan associated with the clinical record. The record should reference the active plan when one exists; otherwise it may reference the most recently selected or explicitly associated plan. Plan status transitions must keep that relationship coherent.

### 5. Safe exercise duplication

Duplicated exercises must be independent entities. If the source exercise has local multimedia, the duplicate must receive a cloned IndexedDB media record with a new `mediaId`. Editing or deleting the duplicate must not affect the source.

Duplicating an exercise from the plan editor must be atomic from the user's perspective: abandoning unsaved plan changes must not leave an orphan exercise in the library.

### 6. Validation and unsaved-change safety

Patient, plan, and exercise editing must enforce meaningful local validation:

- required names and titles cannot be blank;
- numeric values must stay inside valid ranges;
- active plans must contain at least one exercise;
- unsafe destructive/status actions must not silently discard unsaved edits;
- leaving an edited screen must require explicit confirmation when changes are pending.

### 7. Atal IA integrity

Atal IA must never replace a plan's complete exercise list merely because Gemini returned a partial list. Exercise mutations must be explicit: preserve, append, replace one, remove one, or replace all.

Draft contradictions must block ordinary application until the user resolves them or explicitly confirms a reinforced override. Existing version-conflict protection remains intact.

The attachment UI and endpoint must share one cumulative request limit that accounts for base64 expansion and remains below the server's 32 MB body cap.

## Architecture

### Pure domain helpers

Clinical relationship selection, validation, attachment sizing, and exercise-list mutation will be implemented as pure functions. This keeps safety rules independently testable and prepares them for reuse by a future backend adapter.

### Repository boundaries

`atalStore` remains the local source of truth during this block. IndexedDB remains responsible for exercise binary media. New helper functions will wrap multi-step operations so entity and media changes succeed or roll back together where browser storage permits.

### UI integration

Existing screens will consume the new helpers and display errors through current Atal messages, sheets, and dialogs. No new visual language is introduced.

## Error handling

- Store mutations must throw user-readable errors and preserve the prior state on failure.
- Media clone failures must remove any newly created duplicate entity.
- Destructive or status actions with dirty state must require save, discard, or cancel.
- AI drafts with unresolved contradictions must not reach `applyAtalAIDraft` through the normal apply button.
- Oversized attachments must be rejected before file contents are encoded or sent.

## Testing strategy

Tests will cover:

- empty-store initialization and explicit demo initialization;
- draft-plan creation without clinical-record reassignment;
- plan activation and record association;
- independent exercise/media duplication and rollback;
- plan-editor duplicate staging and cancellation;
- patient, plan, and exercise validation;
- unsaved-change guards;
- AI exercise mutation modes;
- contradiction blocking;
- cumulative attachment sizing;
- canonical route rendering smoke tests.

## Out of scope for this block

- Patient-facing plan PDF.
- WhatsApp sharing.
- Remote portal links.
- Backend or database integration.
- Authentication and workspaces.
- Landing page, subscriptions, or payments.
- Real Gemini acceptance testing with production credentials.
- PWA precache redesign.

## Acceptance criteria

This block is complete only when:

1. There is one canonical application route tree.
2. A fresh workspace contains no silent clinical demo data.
3. Existing `atal:store:v2` data continues loading.
4. Draft/duplicate plans cannot displace the active clinical association.
5. Exercise multimedia duplication is independent and rollback-safe.
6. Unsaved edits cannot be lost through status, duplicate, delete, or navigation actions without confirmation.
7. Atal IA preserves existing plan exercises unless an explicit mutation says otherwise.
8. Contradictions block normal AI application.
9. UI and server attachment limits agree.
10. Tests, typecheck, and build are wired into CI.
11. The approved visual system has no intentional changes.
