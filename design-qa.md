# Design QA — Atal Native Clinical

## Source references

- M087–M088: definitive Atal IA interaction behavior.
- M089–M094: Native Clinical composition, density and mobile hierarchy.
- B001–B002: official brand.
- M080: Graphite Clinical.

## Preserved Atal IA states

- Exclusive `/assistant` shell with compact Atal IA header.
- Compact draft card with real completion states.
- Single-open-section accordion and a single edit action per expanded section.
- Full-section mobile editor with save/cancel.
- Contextual chips limited to three.
- Dynamic composer: microphone when empty, send when content is ready, cancel while processing.

## Native Clinical comparison ledger

| Reference | Implemented surface | Intended match |
|---|---|---|
| M089 | `/` | Compact clinical header, priority banner, metric strip, grouped activity and contextual AI recommendation. |
| M090 | `/patients` | Search, segmented status filters, dense full-width rows and stable initials instead of generated portraits. |
| M091 | `/patients/:id` | Patient identity, clinical summary, active-plan context, tabs and thumb-zone actions. |
| M092 | `/plans/:id` | Existing-plan editor, compact facts, ordered exercises, AI recommendation and persistent actions. |
| M093 | `/assistant` | M087–M088 behavior retained; Native Clinical surfaces and Graphite tokens integrated. |
| M094 | `/patients/:id/session` | Focused shell, plan context, progress, larger instructions and real guided-session state. |

## Automated checks

- TypeScript: passed.
- Production build: passed.
- Route-level code splitting: generated independent chunks for Atal IA, guided session, exports and primary screens.
- `git diff --check`: passed before commit.
- Existing `atal:store:v2` data and route relationships were retained.

## Visual comparison status

The references were inspected at original resolution. This Work session did not expose a user-selected browser or the Browser plugin. Product-design policy therefore prohibited launching Playwright without approval, while the task requested uninterrupted execution. Same-browser screenshots, console inspection, interaction replay and pixel-level comparison at 390 × 844 could not be produced here.

final result: blocked

Blocker: browser-rendered screenshot comparison unavailable in the current workspace. Visual acceptance remains for Google AI Studio at 390 × 844 and 430 × 932, including Graphite Clinical and the mobile keyboard.
