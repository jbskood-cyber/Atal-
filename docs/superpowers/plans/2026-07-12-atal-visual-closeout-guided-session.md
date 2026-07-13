# Atal Visual Closeout and Guided Session Plan

**Goal:** Close the remaining local UI interactions and replace the basic patient preview with a complete, persistent guided rehabilitation session.

**Architecture:** Keep clinical routes under `AtalPersistentShell` and patient routes outside it. Use focused React components, typed demo models, and a versioned `localStorage` draft keyed by patient. No remote services or new packages.

**Tech Stack:** React 19, TypeScript, Vite 6, React Router, Tailwind CSS v4, scoped CSS, Poppins.

## Global constraints

- Work only on `feature/atal-visual-closeout-guided-session` from commit `4d73552455ad0fb3d04d19f7e0259f5d90cc18f3`.
- Do not merge, deploy, push to `main`, install dependencies, change stack, or connect external services.
- Preserve B001/B002, M003/M004, and M080 Graphite Clinical.
- SanaNexo is behavior reference only; no code, styles, architecture, Supabase, auth, or public links are copied.

## Phase 1 — Clinical closeout

- Update Exercises with a distinct New exercise CTA.
- Expand Plan Builder with safe responsive selectors and custom duration/frequency state.
- Rebuild New Exercise as a free-form local form with prescription and simulated media fields.
- Fix report avatar geometry, replace More icon, connect notifications, urgency-sort Home, and introduce reusable semantic sliders.

## Phase 2 — Patient flow foundation

- Add typed guided-session models and richer Atal-specific demo exercises.
- Build a patient-only layout and Mi plan/preparation/active/close/summary stages outside the clinical shell.
- Add explicit local-only and therapist-preview language.

## Phase 3 — Execution controls

- Add editable per-set repetitions/time, reversible completion, exercise result selection, optional discomfort feedback, previous/next navigation, and non-blocking rest timer.
- Add early-finish confirmation and partial-session handling.

## Phase 4 — resilience and polish

- Persist/restores versioned drafts, allow confirmed restart, and cover missing patient, empty plan, missing media, storage recovery, partial and complete states.
- Validate light/dark, keyboard/focus, reduced motion, and widths 360/390/430/768/1280.
- Run `npm run typecheck`, `npm run build`, route checks, and capture the requested screens where the environment supports browser rendering.
