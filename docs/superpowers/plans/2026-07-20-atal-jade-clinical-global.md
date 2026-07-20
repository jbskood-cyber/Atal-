# Atal Jade Clinical Global Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the full Atal interface with one global Jade Clinical palette, solid soft-green icon tiles with white glyphs, neutral surfaces, and no green gradients.

**Architecture:** Add one final CSS layer imported after every existing stylesheet. It replaces the global design tokens and supplies narrowly scoped component overrides, so routes, React components, data, and behavior remain unchanged. The layer also defines dark-mode equivalents and semantic status colors.

**Tech Stack:** React 19, TypeScript, Vite, CSS custom properties, existing Atal component classes.

## Global Constraints

- Work only on `feat/atal-jade-clinical-global`, based on `fix/atal-surgical-corrections`.
- Do not modify routes, store shape, `atal:store:v2`, business logic, or backend behavior.
- Use `#137A5A` for primary actions and `#559E88` for solid icon tiles.
- Use `#F7F9F8` for the app canvas, `#FFFFFF` for surfaces, `#151A1E` for primary text, `#5E6965` for secondary text, and `#E3EAE6` for borders.
- Remove green gradients from Atal UI components.
- Keep red, amber, blue, and green semantic colors only for real status meaning.
- Preserve the existing mobile navigation, overlays, sheets, and Atal IA behavior.

---

### Task 1: Add the global visual token layer

**Files:**
- Create: `src/styles/atal-jade-clinical.css`

**Interfaces:**
- Consumes: Existing `--green`, `--green-dark`, `--mint`, `--ink`, `--muted`, `--line`, `--surface`, and `--canvas` custom properties.
- Produces: Global Jade Clinical tokens and component-level overrides loaded last in the cascade.

- [ ] Define the light and dark design tokens.
- [ ] Remove gradient backgrounds from Atal class-based UI surfaces.
- [ ] Convert settings, quick-action, metric, result, and state icon containers to solid `#559E88` with white glyphs.
- [ ] Standardize primary buttons, active filters, navigation, avatars, inputs, sheets, and semantic states.
- [ ] Add reduced-motion and forced-colors safeguards.

### Task 2: Activate the global layer

**Files:**
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `src/styles/atal-jade-clinical.css`.
- Produces: A final import after all existing visual closeout styles.

- [ ] Import `@/src/styles/atal-jade-clinical.css` after `ai-navigation-polish.css`.
- [ ] Confirm no component, route, or runtime import changes.

### Task 3: Verify branch integrity

**Files:**
- Verify: `src/main.tsx`
- Verify: `src/styles/atal-jade-clinical.css`

**Interfaces:**
- Produces: A reviewable branch and draft pull request targeting `fix/atal-surgical-corrections`.

- [ ] Compare the branch against `fix/atal-surgical-corrections` and confirm only the plan, CSS layer, and stylesheet import changed.
- [ ] Run available GitHub checks when a pull request is opened.
- [ ] Leave `main` untouched.
