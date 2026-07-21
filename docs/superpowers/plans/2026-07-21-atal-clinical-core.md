# Atal Clinical Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the local clinical journey from patient record through plan, guided session, report, activity history, and progress metrics without changing the approved visual system.

**Architecture:** Keep `atal:store:v2` as the local source of truth. Guided sessions carry an immutable plan snapshot, completed reports persist that snapshot, and clinical selectors derive timeline and metrics from real stored events and sessions.

**Tech Stack:** React 19, TypeScript 5.9, React Router compatibility layer, localStorage, IndexedDB media references, node:test.

## Global Constraints

- Do not modify approved CSS, dock, themes, iconography, or official green `#7EB695`.
- Do not add backend, authentication, payments, landing, WhatsApp, or new external integrations.
- Do not create GitHub Actions workflows.
- Preserve existing `atal:store:v2` data and legacy migrations.

---

## Implementation checklist

- [x] Preserve an immutable plan and exercise snapshot when a session begins.
- [x] Recover the latest unfinished session even if the active plan changes.
- [x] Prevent archived patients and non-active plans from continuing sessions.
- [x] Persist the historical plan snapshot in the completed session report.
- [x] Record a session-start event exactly once with its real start timestamp.
- [x] Pause active treatment automatically when a patient is archived.
- [x] Separate chronological clinical tracking from session reports.
- [x] Show exercise-level results and patient feedback in each report.
- [x] Protect unsaved physiotherapist observations.
- [x] Add complete contact editing to the patient profile.
- [x] Add clinically meaningful adherence, pain-change, and pending-review metrics.
- [x] Validate and protect clinical-record editing.
- [x] Add Block 2 regression coverage with `node:test`.

## Final verification

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Mobile walkthrough at 360–430 px
- [ ] Confirm no visual regression in light and dark modes
