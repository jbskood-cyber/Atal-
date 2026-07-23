# Block 4.2 execution evidence

## Canonical branch

- Branch: `feature/atal-ai-contextual-workspace-block-4-2`
- Pull request: #16
- Base: `main`
- Base SHA: `bce942ff85f573bba678d84cdb53904ab532a52d`

## Delivered surfaces

The shared contextual Atal AI workspace is available on:

- patient;
- clinical record;
- plan;
- exercise;
- clinical report.

The implementation reuses the Block 4.1 deterministic registry, risk, confirmation, transaction, audit and undo paths. It does not add a second assistant engine or mutation route.

## User visual-review corrections

### Shared viewport anchor

The first AI Studio smoke approved Reporte clínico as the placement reference and approved the structured draft design. It also exposed two placement defects:

- patient and clinical record launchers were mounted inside scrolling content;
- plan used a special raised offset over exercise cards.

The launcher now mounts through a global portal for every supported surface. Patient, clinical record, plan and exercise share the same lower viewport anchor as Reporte clínico. The structured draft design was not modified.

### Native shell overlays

A second AI Studio smoke exposed that the contextual launcher remained visible above the `Más` native sheet. The shell and contextual provider now share explicit launcher-suppression state. Opening `Más`, Search, Notifications or Create removes the orb and exterior recommendations from rendering; closing the overlay restores them.

### End-of-page recommendations

Exterior recommendation chips now disappear when the user reaches the final 96 px of a scrollable page so that final clinical content and actions remain unobstructed. The Atal orb remains available. Scrolling upward restores the recommendations.

## Deterministic regressions

Playwright covers:

- exact context binding and navigation suppression for every surface;
- shared geometry against the approved report anchor at initial scroll position;
- launcher suppression while the `Más` dialog is open and restoration after closing;
- recommendation removal at the end of a long report while preserving the orb;
- recommendation restoration after scrolling upward;
- global lists and settings remaining free of contextual launchers;
- all previously delivered conversation, draft, confirmation, undo, persistence, responsive and accessibility behavior.

## Final validation

The final product-change HEAD was validated by GitHub Actions:

- `quality` run #92 / ID `29987327813`: PASS;
- `e2e` run #69 / ID `29987327798`: PASS;
- Playwright evidence artifact: `playwright-evidence`, ID `8555571401`, retained until 2026-08-06;
- `atal:store:v2` and store version `2` remain preserved;
- `package-lock.json` remains unchanged from the canonical base.

## Approval boundary

The PR remains open, draft and unmerged. Final readiness and merge still require explicit user authorization after the corrected Google AI Studio visual review.
