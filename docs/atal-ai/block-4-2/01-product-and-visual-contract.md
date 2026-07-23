# Block 4.2 — Product and visual contract

## 1. Product intent

Atal IA must become available inside the physiotherapist's current clinical task without behaving like a separate product, without forcing a route change and without obscuring the fact that the user is operating on a specific patient, record, plan, exercise or report.

The contextual experience is one assistant with multiple contexts, not multiple assistants.

The required product flow is:

```text
current clinical screen
  → contextual orb or quick action
  → contextual workspace opens in place
  → context remains visible and pinned
  → query, draft or action is prepared
  → review and confirmation follow Block 4.1 policy
  → deterministic execution
  → audit and optional undo
  → minimize or close
  → exact previous screen restored
```

## 2. Canonical visual states

### 2.1 Closed contextual state

The underlying clinical screen is the primary surface.

Required elements:

- the existing bottom navigation remains visible;
- a compact Atal orb is anchored at the lower-right above the navigation and safe area;
- the orb uses a restrained Liquid Glass treatment: translucent surface, soft border, subtle blur and a low-intensity brand tint;
- the Atal symbol remains legible in light and Graphite themes;
- a small status indicator may communicate availability or a prepared item;
- zero to two compact contextual actions may appear beside the orb;
- the actions use short labels and icons, for example `Actualizar contacto` and `Ver progreso`;
- the orb and actions must never cover a primary page action, floating save control, critical clinical value or system navigation.

The closed state is not a dashboard. It contains no assistant transcript, no draft card and no persistent recommendation stack.

### 2.2 Open contextual workspace

Opening the workspace transforms the bottom interaction area while preserving the current clinical screen behind it.

Required behavior at the first rendered open frame:

- the contextual orb is absent;
- all exterior contextual actions are absent;
- the complete bottom navigation is absent;
- the page route is unchanged;
- the underlying page remains visible behind the workspace;
- the underlying page must not scroll while the workspace owns vertical gestures;
- the workspace is placed above the keyboard and safe area;
- the workspace has its own internal layout and controls.

The open-state mockup is a reference for composition, not permission to keep the bottom navigation or orb visible.

### 2.3 Minimized state

Minimize returns to the same visual composition as the closed state while preserving the active workspace session in memory.

Required behavior:

- bottom navigation returns;
- orb returns;
- exterior actions return when applicable;
- route and scroll are unchanged;
- restoring the workspace returns to the same conversation, draft section and internal scroll position;
- the orb may show a subtle indicator that an active session or draft exists.

### 2.4 Closed/dismissed state

Close dismisses the transient workspace shell.

Required behavior:

- bottom navigation, orb and contextual actions return;
- route, scroll and focus return to the previous clinical screen;
- persisted conversation and draft data remain available through the existing persistence rules;
- transient open panels, menus and confirmation overlays are cleared;
- reopening starts from the persisted conversation context without fabricating a new mutation.

## 3. Workspace anatomy

The open workspace contains these regions in order.

### 3.1 Header

- Atal symbol;
- title `Asistente` or the approved Atal IA title used by the current design system;
- compact context chip such as `en este paciente`, `en este plan`, `en este ejercicio` or `en este reporte`;
- optional concise entity label when space allows;
- minimize control;
- close control;
- optional overflow menu only for real actions such as clearing the contextual conversation or opening the full Atal IA screen.

The header must not duplicate the app's global header.

### 3.2 Context actions

A compact horizontal or wrapping row of context-aware actions. Examples:

- patient: `Actualizar contacto`, `Crear nota`, `Ver progreso`;
- clinical record: `Resumir expediente`, `Completar datos`, `Comparar evolución`;
- plan: `Revisar plan`, `Sugerir ejercicios`, `Ver progreso`;
- exercise: `Adaptar dificultad`, `Revisar instrucciones`, `Añadir al plan`;
- report: `Resumir sesión`, `Comparar evolución`, `Preparar observación`.

Rules:

- actions are compact controls, not cards;
- each action starts a real query or proposal flow;
- a write-oriented action creates a reviewable proposal and never writes immediately;
- unavailable actions are omitted rather than shown as fake enabled controls;
- no more than three primary contextual actions are shown at once on mobile.

### 3.3 Proactive suggestions

The workspace may show one or two concise suggestions derived from stored, deterministic context. Examples:

- missing contact data;
- absence of an initial evaluation;
- incomplete plan metadata;
- overdue review based on stored dates;
- missing exercise instructions.

Rules:

- suggestions cannot invent clinical facts;
- each suggestion names the stored reason that produced it;
- suggestions are compact rows with a clear next action;
- dismissing a suggestion must not modify clinical entities;
- suggestions do not run writes automatically;
- no yellow, red, beige or alarm-like decoration is introduced merely to attract attention.

### 3.4 Main work area

The main area contains:

- conversation transcript;
- structured draft or result panel when applicable.

On wider layouts these may be side by side. On narrow mobile layouts they may stack, use tabs or use a single visible section at a time, provided the conversation and draft remain reachable without losing state.

The mockup's split composition is authoritative for information architecture, not for forcing two cramped columns at 360–430 px.

### 3.5 Conversation

- uses the existing Atal IA message model and persistence;
- identifies user and Atal messages clearly;
- remains concise and operational;
- displays status for analysis, prepared action, confirmation, success, failure and undo;
- does not expose hidden reasoning;
- does not duplicate the same confirmation in both transcript and modal controls;
- preserves the current contextual entity in every request.

### 3.6 Structured draft or result area

- title identifies the draft or operation;
- sections are compact and collapsible;
- only one detailed section should be open at a time on mobile;
- a section uses one edit entry point rather than a pencil per field;
- draft progress percentages must represent real completed fields, not decorative values;
- editing changes the draft only;
- `Aplicar cambios` is visually primary only when the draft is valid and current;
- confirmation is delegated to Block 4.1 policy;
- success exposes `Deshacer` only when the returned receipt is valid.

### 3.7 Composer

Required controls:

- `+` action at the leading edge;
- multiline text input;
- microphone when the input is empty and voice capture is actually available;
- send when text is present;
- never microphone and send as simultaneous competing primary actions;
- clear loading and disabled states;
- keyboard-safe placement;
- input clears only after a successful send handoff;
- no fake attachment, image or PDF workflow is added in this block unless it already exists and is fully functional.

## 4. Context surfaces required in this block

### 4.1 Patient

Context contains at minimum:

- patient ID;
- patient display name;
- route;
- active plan ID when present;
- clinical-record ID/version when present.

Closed actions prioritize contact, note and progress. Suggestions may identify stored missing data.

### 4.2 Clinical record

Context contains patient and clinical-record identity plus current record version. Actions prioritize summary, missing fields, update draft, note and evolution comparison.

### 4.3 Plan

Context contains patient and plan identity, status and version-sensitive data. Actions prioritize review, exercise suggestions, progress and supported status changes.

### 4.4 Exercise

Context contains exercise identity and, when entered through a plan, the parent patient/plan relationship. Actions prioritize instructions, difficulty, precautions, dosage and plan association.

### 4.5 Report

Context contains report/session identity and patient/plan relationship. Actions prioritize summary, comparison and observation drafting.

## 5. Global Atal IA relationship

The global `/assistant` route remains the full-screen Atal IA destination.

The contextual workspace:

- reuses the same conversation and draft contracts;
- creates a context-specific conversation or context branch using existing persistence;
- may offer `Abrir en Atal IA` to continue full-screen;
- must not require navigating to `/assistant` for ordinary contextual work;
- must not fork the registry, risk policy, transaction or undo behavior;
- must not silently merge unrelated patient contexts into one conversation.

## 6. Visual language

- Follow Atal Native Clinical spacing, typography, radii and motion.
- Use existing theme tokens rather than hardcoded mockup colors.
- The orb may use the approved subtle Atal brand tint while the rest of the product retains current theme semantics.
- Liquid Glass means restrained translucency and hierarchy, not heavy blur, glow or illegible contrast.
- Avoid nested cards, large empty decorative surfaces and excessive borders.
- Preserve Blue Clinical and Graphite Clinical compatibility.
- Respect reduced motion; the orb's occasional glow or pulse must stop when reduced motion is enabled.

## 7. Explicitly out of scope

- autonomous diagnosis, prescription or prognosis;
- a separate AI model or assistant per screen;
- a new backend or cloud conversation store;
- external messaging or automatic delivery;
- full voice-first guided-session mode;
- image/PDF clinical analysis unless separately contracted;
- redesigning patient, plan, exercise or report pages beyond the integration needed for the contextual layer;
- replacing the global Atal IA screen;
- permanent destructive tools not already supported by Block 4.1.

## 8. Product success criteria

The contextual workspace succeeds when the physiotherapist can ask, review and safely apply an operation while remaining visibly anchored to the current clinical entity, then minimize or close and continue exactly where they were.

It fails when opening changes route, loses scroll, leaves duplicate navigation visible, obscures critical controls, creates a second mutation path, applies drafts prematurely or presents generic suggestions unrelated to stored context.