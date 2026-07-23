# Block 4.2 — Interaction state and shell architecture

## 1. Architectural decision

Implement one shared contextual-workspace controller and one shared workspace shell. Product screens provide typed context and actions; they do not implement their own assistant state machine, conversation persistence or mutation logic.

The required flow is:

```text
screen adapter
  → typed ContextualAIContext
  → shared workspace controller
  → shared closed trigger/orb
  → shared open workspace shell
  → existing conversation/draft adapters
  → Block 4.1 execution core
```

Do not create independent workspace implementations for patient, record, plan, exercise and report.

## 2. State model

The controller must represent at least these modes:

```ts
export type ContextualWorkspaceMode =
  | 'closed'
  | 'open'
  | 'minimized';
```

The distinction between `closed` and `minimized` is behavioral, even though both display the bottom navigation and orb.

- `closed`: no active transient workspace shell; persisted conversation/draft may still exist.
- `open`: workspace visible; bottom navigation, orb and exterior quick actions hidden.
- `minimized`: workspace shell hidden but transient internal state retained for immediate restoration.

The controller must not use route changes to represent these modes.

## 3. Required controller state

A shared controller should own or derive:

```ts
export type ContextualAIContext = {
  surface: 'patient' | 'clinical-record' | 'plan' | 'exercise' | 'report';
  route: string;
  patientId: string;
  clinicalRecordId: string;
  clinicalRecordVersion: number | null;
  planId: string;
  exerciseId: string;
  sessionId: string;
  reportId: string;
  contextLabel: string;
};

export type ContextualWorkspaceSession = {
  mode: ContextualWorkspaceMode;
  context: ContextualAIContext | null;
  conversationId: string;
  draftId: string;
  activePane: 'conversation' | 'draft';
  expandedDraftSection: string;
  internalScroll: {
    conversation: number;
    draft: number;
  };
};
```

Exact property names may adapt to the existing codebase, but the concepts and guarantees are mandatory.

Do not duplicate clinical entities inside workspace UI state. Store IDs and read current snapshots through existing selectors/store APIs.

## 4. Open transition

Opening from the orb or a contextual quick action must perform one atomic UI transition:

1. capture the exact route including path, search and hash;
2. capture `window.scrollY` or the active screen scroll container position;
3. capture the trigger element for focus restoration;
4. resolve and validate the typed context from current route/entity IDs;
5. choose or create the appropriate contextual conversation using existing persistence;
6. set mode to `open`;
7. hide bottom navigation, orb and exterior actions through shared shell state;
8. lock underlying page scrolling without moving the page;
9. render the workspace;
10. focus the workspace heading or composer according to the originating action.

No history entry may be pushed and no navigation API may be called.

## 5. Minimize transition

Minimize must:

1. persist draft/conversation changes through existing persistence rules;
2. save internal conversation/draft scroll positions;
3. set mode to `minimized`;
4. unlock the underlying screen;
5. restore the exact captured page scroll position;
6. show bottom navigation, orb and exterior actions;
7. restore focus to the orb or originating action;
8. keep the active contextual session ready to restore.

Restoring from minimized must reopen the same context and internal state without creating a duplicate conversation or draft.

## 6. Close transition

Close must:

1. finish or cancel any transient UI-only state such as open menus;
2. never auto-apply a pending draft;
3. preserve conversation/draft persistence already committed by existing mechanisms;
4. clear the transient session shell state;
5. set mode to `closed`;
6. unlock and restore the underlying page scroll;
7. restore bottom navigation, orb and exterior actions;
8. restore focus to the original trigger;
9. keep route and browser history unchanged.

If a confirmation dialog is open, close must first resolve that dialog through an explicit cancel path; it may not silently confirm or discard a persisted draft.

## 7. Context change while open

Ordinary navigation is unavailable through the hidden bottom navigation, but the underlying route may still change through browser history, a system back gesture or an internal client effect.

The controller must define deterministic behavior:

- if the route changes to a different entity while the workspace is open, validate whether the existing context is still current;
- never silently retarget a pending write to the new entity;
- a query-only empty workspace may refresh context after explicit UI acknowledgement;
- a pending draft, confirmation or undo receipt must remain bound to its original entity and show a clear context mismatch state;
- the safest default is to minimize/close and require reopening on the new entity.

No pending confirmation proof may survive a target/context change unless Block 4.1 validates the exact proposal fingerprint and references.

## 8. Bottom navigation suppression

Bottom navigation visibility must be controlled through application shell state, not through DOM query selectors, arbitrary CSS sibling selectors or route spoofing.

Required shell behavior:

```text
workspace mode open
  → bottom navigation not rendered or rendered inert/hidden by shell contract
  → page bottom padding recalculated for workspace, not nav

workspace mode closed/minimized
  → bottom navigation rendered normally
  → normal safe-area and content padding restored
```

The implementation must avoid a blank nav-sized gap while open.

The orb and exterior quick actions must consume the same shared `isContextualWorkspaceOpen` state so duplicate controls cannot remain visible.

## 9. Workspace mounting

The workspace should mount through the existing application shell or a portal owned by it, so it can:

- sit above the current screen;
- suppress the bottom navigation centrally;
- respect safe areas;
- manage focus and scroll locking;
- remain independent from individual screen stacking contexts;
- avoid being clipped by page containers.

Do not mount one portal per screen.

## 10. Mobile layout behavior

At 360–430 px:

- workspace is anchored to the lower viewport and uses the area released by the hidden bottom navigation;
- width respects page margins and safe areas;
- height is content-aware with an upper bound that leaves meaningful clinical context visible behind when keyboard is closed;
- when keyboard opens, workspace may expand upward and reduce the visible background rather than allowing the composer to be covered;
- the workspace owns one primary internal scrolling region at a time;
- avoid two simultaneously active nested vertical scroll containers;
- conversation and draft may use a segmented control or compact tabs rather than two narrow columns.

## 11. Wider layout behavior

At tablet/desktop widths:

- workspace may remain a floating lower-right or lower-center surface;
- conversation and draft can appear side by side;
- max width prevents the workspace from becoming a full dashboard;
- the underlying route remains visible;
- the same state machine and core integration are used.

## 12. Focus and keyboard contract

- Opening moves focus into the workspace without losing the trigger reference.
- `Escape` closes only when it cannot accidentally bypass a confirmation; otherwise it cancels the topmost transient layer first.
- Tab order follows header → actions → suggestions → conversation/draft controls → composer.
- Minimize and close restore focus.
- The composer remains above the Android/iOS virtual keyboard.
- Closing the keyboard does not close the workspace.
- The browser back action must not unexpectedly navigate away because opening did not create a history entry.

## 13. Persistence contract

Persist through existing stores only:

- AI conversations;
- AI drafts;
- applied product changes through `atal:store:v2`;
- audit and undo receipts through Block 4.1 behavior.

Do not persist:

- stale DOM element references;
- raw scroll element objects;
- open confirmation UI;
- temporary microphone state;
- a second copy of patient/plan/exercise data.

After reload:

- the underlying route reloads normally;
- workspace defaults to `closed` unless an existing product requirement explicitly restores it;
- persisted conversation and draft remain discoverable;
- no write is automatically resumed or applied.

## 14. Suggested file responsibilities

The implementer must inspect the actual repository before naming files. The target responsibilities are:

```text
contextual-ai/
├── ContextualAIProvider or controller hook
├── ContextualAIWorkspace
├── ContextualAITrigger
├── ContextualAIHeader
├── ContextualAIActions
├── ContextualAISuggestions
├── ContextualAIConversation
├── ContextualAIDraftPanel
├── ContextualAIComposer
├── context adapters per product surface
└── state-machine and view tests
```

Existing Atal AI components should be extracted or reused when safe. Do not copy the global conversation screen wholesale into a new implementation.

## 15. Failure conditions

The architecture is unacceptable if:

- a screen owns its own independent assistant store;
- opening pushes `/assistant` or another route;
- scroll jumps to the top;
- bottom navigation remains visible or leaves an empty reserved gap;
- an orb remains visible on top of the open workspace;
- minimize loses the active draft or transcript position;
- close applies or discards a real draft implicitly;
- a target entity can change without invalidating a pending confirmation;
- focus is lost behind the overlay;
- keyboard covers the composer.