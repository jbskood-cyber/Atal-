# Atal Exercise Image Pilot — Review Ledger

**Status:** six pilot frames generated as accessible programmatic SVG drafts; independent clinical, visual, thumbnail, accessibility, and product-owner review remains required.

Approval requires independent visual, clinical, accessibility, and product-owner review. A blank or pending field is a release blocker.

| Exercise | Frame | Movement correspondence | Anatomy | Equipment / support | Composition / crop | Alt text | Provenance / checksum | Clinical | Visual | Accessibility | Product owner | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| e01 Sentadilla asistida | start | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `efe6cdfd703e392ab574ccc67fe1ae8c0632e29f101a389fc125311ee5dbb106` | pending | pending | pending | pending | pending | `/exercises/v1/knee/e01/start.svg`; card v1 |
| e01 Sentadilla asistida | end | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `34659a08f7af5a428fd38992bf66c473758bb796d05d18fd9d9aa49581ef46b2` | pending | pending | pending | pending | pending | `/exercises/v1/knee/e01/end.svg`; shallow squat and supported heels require review |
| e14 Rotación externa con banda | start | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `dba9fd9ce6b2f770931b110ab4d85ad557d5ee21c582878429bec46e4fafe183` | pending | pending | pending | pending | pending | `/exercises/v1/shoulder/e14/start.svg`; card v1 |
| e14 Rotación externa con banda | end | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `55cb0da247134f7e30dcaa8b65a921b26f18a1c439cb7cb86875ed4f6d16af1e` | pending | pending | pending | pending | pending | `/exercises/v1/shoulder/e14/end.svg`; elbow-at-side and trunk stability require review |
| e27 Dead bug con deslizamiento de talón | start | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `47ac93748e4ccb36a49f383d06cb3e08ba1dc7bf435e5170629b924f8553af2e` | pending | pending | pending | pending | pending | `/exercises/v1/lumbar/e27/start.svg`; card v1 |
| e27 Dead bug con deslizamiento de talón | end | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `48ff666243b48bd6f4b1bcbe355be2c4de567c0c0ee6464507f68d33e5c7547c` | pending | pending | pending | pending | pending | `/exercises/v1/lumbar/e27/end.svg`; right heel contact and thumbnail distinction require review |

## Review rules

- **Movement correspondence:** frame matches the canonical start/end description and cannot be confused with a neighboring exercise.
- **Anatomy:** proportions and joint positions are clinically legible; no missing or duplicated anatomy.
- **Equipment/support:** exact equipment and safe support described by the card; no invented objects.
- **Composition/crop:** all relevant joints, hands, feet, band anchor, mat, or support remain visible.
- **Alt text:** accurately describes position and movement state without promotional or diagnostic language.
- **Provenance/checksum:** generator, card version, dimensions, and SHA-256 recorded in the manifest and this ledger.
- **Result:** only `pass`, `fail`, or `pending`. A failed row cannot be shipped.
- **Thumbnail observability:** start/end sequences must remain distinguishable without labels at the smallest product thumbnail; otherwise reject or change media mode.

No row may be changed to `pass` automatically by the generator or by a test suite.
