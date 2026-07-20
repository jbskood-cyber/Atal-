# Atal Unified Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize Atal's color, typography, and shared component language without changing routes, data, screen structure, or behavior.

**Architecture:** Add one canonical visual-system stylesheet loaded after the existing legacy layers, followed by one screenshot-driven surgical QA layer. The layers define the approved mint-green scale, semantic colors, typography scale, light/dark tokens, and targeted overrides for the 16 reviewed mobile captures. Existing JSX and business logic remain untouched.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Lucide React.

## Global Constraints

- Base commit: `c745ec64824f721b797109b1e4344749090095e0`.
- Work only on `feature/atal-unified-visual-system`.
- Do not modify routes, store schemas, IDs, IndexedDB, Atal IA behavior, or clinical flows.
- Preserve existing screen structure and navigation.
- Use the approved solid mint green derived from the supplied reference: `#7EB695`.
- Do not introduce gradients.
- Keep red, amber, blue, and green semantic colors only for meaningful states.
- Use system UI typography for the product interface and retain Poppins only for the Atal wordmark.

---

### Task 1: Create the canonical visual system

**Files:**
- Create: `src/styles/atal-unified-visual-system.css`

- [x] Define the approved mint scale and map legacy aliases such as `--green`, `--green-dark`, and `--mint` to the new system.
- [x] Define one interface font stack and one consistent type scale.
- [x] Standardize buttons, icon containers, tabs, filters, inputs, cards, sheets, navigation, and focus states.
- [x] Remove gradients from UI surfaces while preserving semantic warning and danger states.
- [x] Add dark-mode token mappings under `html[data-theme='dark']`.

### Task 2: Activate the system globally

**Files:**
- Modify: `src/main.tsx`

- [x] Import `@/src/styles/atal-unified-visual-system.css` after every legacy stylesheet.
- [x] Confirm no React route or provider code changes.

### Task 3: Apply the 67 screenshot-driven corrections

**Files:**
- Create: `src/styles/atal-surgical-qa.css`
- Create: `docs/visual-qa/2026-07-20-surgical-checklist.md`
- Modify: `src/main.tsx`

- [x] Implement the 25 corrections for Inicio, Pacientes, Planes and Atal IA.
- [x] Implement the 24 corrections for Ajustes, preferences and forms.
- [x] Implement the 18 corrections for plan detail, plan exercises and patient record.
- [x] Load the surgical QA layer after the canonical visual system.
- [x] Keep all React components, routes, stores and clinical behavior unchanged.

### Task 4: Verify the integration

- [x] Confirm the branch contains only documentation and visual-system changes.
- [x] Confirm the surgical stylesheet is loaded last.
- [x] Review the diff against `main`.
- [ ] Run `npm run build` in Google AI Studio or a connected development environment.
- [ ] Visually review the 16 captured states and dark mode before merging.
- [ ] Confirm there are no console errors, clipped content, overlaps or regressions.

## Current status

The 67 checklist items are implemented in code and individually mapped in `docs/visual-qa/2026-07-20-surgical-checklist.md`. They remain **pending rendered QA** because this GitHub-only environment cannot start the Vite preview or execute the build.
