# Atal Unified Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize Atal's color, typography, and shared component language without changing routes, data, screen structure, or behavior.

**Architecture:** Add one canonical visual-system stylesheet loaded after the existing legacy layers. It defines the approved mint-green scale, semantic colors, typography scale, light/dark tokens, and safe component overrides. Existing JSX and business logic remain untouched.

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

**Interfaces:**
- Consumes: existing Atal class names and legacy CSS variables.
- Produces: canonical color aliases, typography tokens, shared component styles, and dark-mode equivalents.

- [ ] Define the approved mint scale and map legacy aliases such as `--green`, `--green-dark`, and `--mint` to the new system.
- [ ] Define one interface font stack and one consistent type scale.
- [ ] Standardize buttons, icon containers, tabs, filters, inputs, cards, sheets, navigation, and focus states.
- [ ] Remove gradients from UI surfaces while preserving semantic warning and danger states.
- [ ] Add dark-mode token mappings under `html[data-theme='dark']`.

### Task 2: Activate the system globally

**Files:**
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `src/styles/atal-unified-visual-system.css`.
- Produces: a final CSS layer loaded after all legacy styles.

- [ ] Import `@/src/styles/atal-unified-visual-system.css` after every existing stylesheet.
- [ ] Confirm no React route or provider code changes.

### Task 3: Verify the integration

**Files:**
- Verify: `src/styles/atal-unified-visual-system.css`
- Verify: `src/main.tsx`

- [ ] Confirm the branch contains only documentation and visual-system changes.
- [ ] Confirm the new stylesheet is loaded last.
- [ ] Review the diff against `main`.
- [ ] Run `npm run build` in Google AI Studio or a connected development environment.
- [ ] Visually review Inicio, Pacientes, Planes, Ejercicios, Actividad, Ajustes, Atal IA, sheets, forms, portal del paciente, and dark mode before merging.
