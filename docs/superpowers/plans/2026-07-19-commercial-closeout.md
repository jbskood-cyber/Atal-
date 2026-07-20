# Atal Commercial Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining commercial UI and functional gaps in exercise management, Atal IA, settings, feedback, patient portal, guided sessions, patients, and plans without redesigning the approved product.

**Architecture:** Keep `atal:store:v2`, existing routes, and clinical entities intact. Implement behavior in existing screen components, pass Atal IA preferences through the existing request contract, and add one final scoped CSS layer for visual polish and patient accessibility.

**Tech Stack:** React 19, TypeScript 5.9, Vite 6, React Router, lucide-react, localStorage-backed `atal:store:v2`.

## Global Constraints

- Work only on `fix/atal-surgical-corrections`; do not modify `main`.
- No new dependencies, backend, authentication simulation, or fake commercial claims.
- A control must work locally or be hidden.
- Preserve `atal:store:v2`, patient/plan/exercise IDs, Atal IA drafts, and guided-session data.
- Keep the approved white-and-green visual system and black theme.
- Avoid prototype copy: demo, local, future authentication, ChatGPT, remote channel.

---

### Task 1: Exercise action safety

**Files:**
- Modify: `src/screens/ExerciseDetailScreen.tsx`

- [ ] Replace “Eliminar si es seguro” with a deliberate “Más opciones” flow.
- [ ] Keep Archive visible as the safe lifecycle action.
- [ ] Show “Eliminar ejercicio” only in a destructive confirmation dialog.
- [ ] When linked to plans, show a neutral restriction and direct the user to Archive.
- [ ] Include the exact exercise name in confirmation.

### Task 2: Atal IA processing and preferences

**Files:**
- Modify: `src/features/atal-ai/components/AIComposer.tsx`
- Modify: `src/features/atal-ai/AtalAIConversationScreen.tsx`
- Modify: `src/features/atal-ai/types.ts`
- Modify: `server/atalAIPlugin.ts`

- [ ] Replace the dark processing control with a green, white-icon stop button.
- [ ] Simplify processing copy to product language.
- [ ] Pass suggestions, alerts, and professional instructions in the AI request.
- [ ] Apply preferences in the server prompt without exposing them as user content.

### Task 3: Commercial settings

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/SettingsDetailScreen.tsx`
- Modify: `src/screens/PatientPortalPreviewScreen.tsx`

- [ ] Remove System States from commercial navigation.
- [ ] Keep only controls that work: notifications, haptics, compact mode, profile, appearance, privacy, AI preferences, feedback.
- [ ] Remove duplicate headings and prototype language.
- [ ] Rename themes to Claro, Oscuro, Sistema with product copy.
- [ ] Make privacy control affect identity shown in patient preview.
- [ ] Keep profile editing persistent.

### Task 4: Feedback productization

**Files:**
- Modify: `src/screens/FeedbackScreen.tsx`

- [ ] Remove local/prototype/channel language.
- [ ] Rename the CTA to “Compartir comentario”.
- [ ] Preserve Web Share, clipboard, and download fallback behavior.
- [ ] Simplify screenshot attachment and history copy.

### Task 5: Patient readability and list polish

**Files:**
- Create: `src/styles/commercial-closeout.css`
- Modify: `src/main.tsx`

- [ ] Use system typography in patient portal and guided sessions.
- [ ] Raise body, metadata, control, and touch-target sizes.
- [ ] Preserve responsive layouts and black-theme contrast.
- [ ] Refine patient and plan row hierarchy without restructuring screens.
- [ ] Add scoped styles for commercial settings, AI stop button, exercise dialogs, and feedback.

### Task 6: Verification

**Files:**
- Review all files above.

- [ ] Confirm no new dependencies or schema version change.
- [ ] Confirm `atal:store:v2` remains the storage key.
- [ ] Run `npm run typecheck` and `npm run build` in AI Studio.
- [ ] Validate mobile preview in Claro and Oscuro.
- [ ] Verify no horizontal overflow, hidden destructive action, readable patient flow, and working settings persistence.
