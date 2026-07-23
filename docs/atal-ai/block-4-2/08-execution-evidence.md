# Block 4.2 execution evidence

## Canonical branch

- Branch: `feature/atal-ai-contextual-workspace-block-4-2`
- Pull request: #16
- Base: `main`
- Base SHA: `bce942ff85f573bba678d84cdb53904ab532a52d`

## Delivered surfaces

The shared contextual Atal AI workspace is available on patient, clinical record, plan, exercise and clinical report screens. It reuses the Block 4.1 deterministic registry, risk, confirmation, transaction, audit and undo paths.

## User visual-review corrections

### Shared viewport anchor

Reporte clínico is the approved placement reference. All supported surfaces mount the launcher through the same global portal and lower viewport anchor. Patient and clinical record no longer require scrolling to reach Atal IA, and Plan no longer uses a raised offset over exercise cards.

### Native shell overlays

The contextual launcher is removed from rendering while `Más`, Search, Notifications or Create is open. Closing the shell overlay restores the orb and exterior actions.

### End-of-page recommendations

Exterior recommendation chips disappear within the final 96 px of a scrollable page so they do not cover final clinical content or actions. The Atal orb remains available. Scrolling upward restores the chips.

The structured draft design approved by the user was not modified.

## Deterministic regressions

Playwright covers exact context binding, navigation suppression, shared geometry, shell-overlay suppression and restoration, end-of-page recommendation removal while preserving the orb, recommendation restoration after scrolling upward, and all earlier conversation, draft, confirmation, undo, persistence, responsive and accessibility behavior.

## Final validation

Product-change HEAD `1d0fd838ccf39d92275c56709715e2a3aecd8559` passed:

- `quality` run #92 / ID `29987327813`;
- `e2e` run #69 / ID `29987327798`;
- evidence artifact `playwright-evidence`, ID `8555571401`, retained until 2026-08-06.

The subsequent branch commit only updates this evidence document and does not change product, test, dependency or lockfile content.

`atal:store:v2`, store version `2` and the canonical `package-lock.json` remain preserved.

## Approval boundary

The PR remains open, draft and unmerged. Final readiness and merge require explicit user authorization after the corrected Google AI Studio visual review.
