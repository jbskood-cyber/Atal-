# Block 4.2 — Context, actions, drafts and core integration

## 1. Trust boundary

The contextual workspace is a presentation and orchestration layer. It does not become a new trust boundary and it does not own business mutation logic.

Required flow:

```text
contextual UI input
  → existing Gemini analysis boundary
  → validated structured proposal
  → contextual adapter adds exact route/entity context
  → Block 4.1 execution engine
  → query result, draft, clarification, confirmation or executed result
```

Everything after the model proposal remains deterministic application code.

## 2. Context construction

Every contextual request must include an exact, typed snapshot of the current work context. At minimum:

```ts
export type ContextualAIRequestContext = {
  surface: 'patient' | 'clinical-record' | 'plan' | 'exercise' | 'report';
  route: string;
  selectedPatientId: string;
  selectedClinicalRecordId: string;
  selectedClinicalRecordVersion: number | null;
  selectedPlanId: string;
  selectedExerciseId: string;
  selectedSessionId: string;
  selectedReportId: string;
  conversationId: string;
  draftId: string;
};
```

The adapter must derive IDs from authoritative route/store state. Display labels are not substitutes for IDs.

## 3. Context precedence

Entity resolution continues to follow Block 4.1 precedence:

1. explicit valid ID in the proposed tool input;
2. valid selected entity in the contextual workspace;
3. unique exact normalized match;
4. unique constrained match inside a resolved parent;
5. otherwise clarification and zero mutation.

The contextual adapter may improve resolution by supplying selected IDs, but it may not weaken ambiguity handling.

## 4. Conversation identity

A contextual conversation must be scoped so unrelated clinical entities do not silently share one operational thread.

A valid strategy is a stable context key built from:

```text
surface + patientId + optional record/plan/exercise/report ID
```

Requirements:

- reopening the same context can continue its existing conversation;
- opening a different patient creates or selects a different context thread;
- a plan conversation remains associated with its patient and plan;
- a global Atal IA conversation may import or continue a contextual thread only through an explicit action;
- no raw private-contact data is placed in conversation metadata or audit records unless required by the visible user request and allowed by existing privacy rules.

## 5. Contextual quick actions

Quick actions are typed intent starters, not direct mutators.

Each action definition must include:

```ts
export type ContextualActionDefinition = {
  id: string;
  surfaces: Array<ContextualAIRequestContext['surface']>;
  label: string;
  icon: string;
  intent: string;
  requiredEntityTypes: string[];
  availability: (snapshot: unknown, context: ContextualAIRequestContext) => boolean;
  initialMessage: (snapshot: unknown, context: ContextualAIRequestContext) => string;
};
```

The actual type may differ, but availability must be deterministic and context-specific.

### Patient actions

Required initial actions where data permits:

- `Actualizar contacto` — prepares a patient/contact draft; never writes immediately.
- `Crear nota` — prepares a note proposal; application follows reversible-write confirmation.
- `Ver progreso` — read-only summary from plans/sessions/reports.

### Clinical-record actions

- `Resumir expediente` — read-only.
- `Completar datos` — prepares a version-aware record draft.
- `Comparar evolución` — read-only based on stored versions/sessions.

### Plan actions

- `Revisar plan` — read-only quality/structure summary.
- `Sugerir ejercicios` — draft-only proposal.
- `Ver progreso` — read-only.
- Supported status actions remain available only through Block 4.1 risk/confirmation policy.

### Exercise actions

- `Revisar instrucciones` — read-only or draft depending on request.
- `Adaptar dificultad` — draft-only.
- `Añadir al plan` — proposal requiring exact patient/plan resolution.

### Report actions

- `Resumir sesión` — read-only.
- `Comparar evolución` — read-only.
- `Preparar observación` — draft-only until user applies.

## 6. Proactive suggestion generation

Suggestions must come from deterministic rules over stored data. Gemini may help phrase an explanation only after the rule identifies the condition.

Examples of deterministic rules:

- patient contact fields are empty;
- no clinical record exists;
- record has required fields empty;
- no active plan exists;
- active plan has no exercises;
- exercise instructions are empty;
- report/session is pending review;
- stored plan review date has passed.

Suggestion contracts:

```ts
export type ContextualSuggestion = {
  id: string;
  reasonCode: string;
  message: string;
  actionId: string;
  entityRefs: Array<{ type: string; id: string }>;
  dismissible: boolean;
};
```

No suggestion may:

- infer an unstored diagnosis;
- claim a clinical risk not computed by an approved deterministic rule;
- create an audit success event merely by being displayed;
- auto-execute its action.

## 7. Draft behavior

The contextual workspace reuses the existing Atal AI draft model and Block 4.1 draft adapters.

Required guarantees:

- draft creation changes only AI draft persistence;
- editing a section changes only the draft;
- the underlying patient/record/plan/exercise/report remains unchanged until `Aplicar cambios` succeeds;
- a draft captures target IDs and version/fingerprint data required for conflict detection;
- the visible context identifies the target entity before apply;
- stale drafts show a clear conflict and disable apply;
- cancelling a confirmation leaves the draft available and product state unchanged;
- a successful apply updates the draft/result UI using the execution result, not optimistic assumptions.

## 8. Confirmation behavior

The workspace must render confirmation requests returned by Block 4.1.

Requirements:

- confirmation names the action and target entity;
- the exact proposal fingerprint is retained;
- changing draft inputs or context invalidates the prior proof;
- sensitive/destructive confirmations cannot be bypassed through a quick action or keyboard shortcut;
- confirmation controls remain above the keyboard and accessible;
- cancel produces zero product mutation and no success audit entry;
- external actions remain blocked unless separately implemented and approved.

## 9. Execution and results

The contextual UI consumes discriminated outcomes from the execution engine.

Expected classes include:

- read/query result;
- draft prepared;
- clarification required;
- confirmation required;
- executed success;
- validation/precondition failure;
- conflict;
- unsupported/blocked action;
- undo success/failure.

The UI must not treat a returned assistant message alone as proof of successful mutation. It must rely on the deterministic result shape and transaction/audit identifiers.

## 10. Audit and privacy

Every successful write remains audited through Block 4.1.

The contextual layer may add safe metadata such as:

- source surface;
- route identifier without query secrets;
- conversation ID;
- proposal ID;
- context entity references.

It must not add:

- phone numbers;
- email addresses;
- street addresses;
- emergency contact text;
- image/base64 payloads;
- full prompt/response bodies;
- hidden reasoning;
- secret/API-key material.

A failed or cancelled operation must not create a success audit event.

## 11. Undo

When Block 4.1 returns a valid undo receipt:

- show a clear `Deshacer cambio` action in the result area;
- bind it to the exact transaction receipt;
- display expiry/availability through concise copy when needed;
- disable it when the receipt expires or current versions no longer match;
- execute undo through the existing undo engine;
- update the underlying visible clinical screen from store subscriptions;
- do not manually patch React state to imitate undo.

## 12. Global assistant compatibility

The contextual and global surfaces must produce equivalent safety behavior for the same tool invocation and entity context.

Required compatibility tests:

- same read query returns equivalent domain result;
- same write proposal receives the same risk class;
- same ambiguous target produces clarification;
- same stale version produces conflict;
- same successful transaction produces structured audit and undo behavior.

Differences may exist only in presentation and how context IDs are supplied.

## 13. Network and error behavior

- Intercepted/test Gemini failures must produce a recoverable error state.
- Network failure cannot create a draft or mutation unless a valid structured response was already persisted and explicitly applied.
- Retry reuses the current context and does not duplicate the user message or transaction.
- A malformed model response is rejected before the core.
- The composer remains usable after recoverable failures.
- No generic success copy is shown on timeout or parse failure.

## 14. Failure conditions

The integration fails if:

- quick actions call store APIs directly;
- context labels are used as mutation identifiers;
- a patient/plan target can change without invalidating a proposal;
- a draft edits real entities before apply;
- confirmation is represented only as conversational text;
- an assistant message is treated as transaction success;
- the contextual UI creates its own audit or undo implementation;
- global and contextual surfaces classify the same action differently;
- private contact data leaks into audit metadata.