# Atal Unified Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize Atal's color, typography, and shared component language without changing routes, data, screen structure, or behavior.

**Architecture:** Add canonical visual-system styles loaded after the existing legacy layers. They define the approved mint-green scale, semantic colors, typography scale, light/dark tokens, screenshot-driven surgical corrections, and residual compatibility overrides. Two presentation-only React edits remove redundant brand copy.

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

- [x] Import the canonical visual system after every legacy stylesheet.
- [x] Confirm no React route or provider code changes.

### Task 3: Apply the first screenshot-driven QA round

**Files:**
- Create: `src/styles/atal-surgical-qa.css`
- Create: `docs/visual-qa/2026-07-20-surgical-checklist.md`

- [x] Implement 67 visual corrections from 16 mobile screenshots.
- [x] Correct clipping, overlap, typography, spacing, safe areas, and component consistency.
- [x] Preserve routes, data, storage, and clinical behavior.

### Task 4: Apply residual QA round

**Files:**
- Modify: `src/components/atal/AtalLogo.tsx`
- Modify: `src/features/atal-ai/components/ConversationalDraftCard.tsx`
- Create: `src/styles/atal-residual-polish.css`
- Create: `src/styles/atal-residual-compat.css`
- Create: `docs/visual-qa/2026-07-20-residual-polish-checklist.md`

- [x] Standardize all visible brand greens to `#7EB695`.
- [x] Remove “Fisioterapia” from the wordmark.
- [x] Remove “Borrador editable” from Atal IA.
- [x] Correct Atal IA header, chips, progress badges, toast, and composer placeholder.
- [x] Correct notification bell and Home metrics.
- [x] Invert semantic clinical icon treatment.
- [x] Replace dock underline with liquid-glass active capsules.
- [x] Integrate the Atal IA action into the dock material.

### Task 5: Verify the integration

- [x] Confirm the branch changes only documentation, presentation components, and visual styles.
- [x] Confirm the residual compatibility stylesheet is loaded last.
- [x] Review the static diff against `main`.
- [ ] Run `npm run build` in Google AI Studio or a connected development environment.
- [ ] Visually review the approved screenshots, residual checklist, and dark mode before merging.
- [ ] Confirm there are no console errors, clipped content, overlaps or regressions.

## Current status

The 67 initial items and the 25 residual items are implemented and mapped in their respective QA checklists. They remain **pending rendered QA** because this GitHub-only environment cannot start the Vite preview or execute the build.
