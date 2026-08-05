# Atal Exercise Image Pilot — Review Ledger

**Status:** six pilot frames generated as accessible programmatic SVG drafts; technical visual, thumbnail, accessibility, and correspondence QA completed on current HEAD. Independent clinical and product-owner approval remain required before resolver integration.

Approval requires independent clinical and product-owner review. A blank or pending required field is a release blocker.

| Exercise | Frame | Movement correspondence | Anatomy | Equipment / support | Composition / crop | Alt text | Provenance / checksum | Clinical | Visual | Accessibility | Product owner | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| e01 Sentadilla asistida | start | pass | pass | pass | pass | pass | programmatic-svg-v1 · 1200×900 · `efe6cdfd703e392ab574ccc67fe1ae8c0632e29f101a389fc125311ee5dbb106` | pending | pass | pass | pending | pending | `/exercises/v1/knee/e01/start.svg`; full body, hands, rail and feet remain visible; readable at thumbnail size |
| e01 Sentadilla asistida | end | pass | pass | pass | pass | pass | programmatic-svg-v1 · 1200×900 · `34659a08f7af5a428fd38992bf66c473758bb796d05d18fd9d9aa49581ef46b2` | pending | pass | pass | pending | pending | `/exercises/v1/knee/e01/end.svg`; shallow squat is clearly distinct from start, heels remain supported and knees track symmetrically |
| e14 Rotación externa con banda | start | pass | pass | pass | pass | pass | programmatic-svg-v1 · 1200×900 · `dba9fd9ce6b2f770931b110ab4d85ad557d5ee21c582878429bec46e4fafe183` | pending | pass | pass | pending | pending | `/exercises/v1/shoulder/e14/start.svg`; codo junto al costado, mano frente al abdomen y anclaje opuesto visibles |
| e14 Rotación externa con banda | end | pass | pass | pass | pass | pass | programmatic-svg-v1 · 1200×900 · `55cb0da247134f7e30dcaa8b65a921b26f18a1c439cb7cb86875ed4f6d16af1e` | pending | pass | pass | pending | pending | `/exercises/v1/shoulder/e14/end.svg`; outward forearm displacement increases band length while elbow and trunk remain fixed |
| e27 Dead bug con deslizamiento de talón | start | pass | pass | pass | pass | pass | programmatic-svg-v1 · 1200×900 · `47ac93748e4ccb36a49f383d06cb3e08ba1dc7bf435e5170629b924f8553af2e` | pending | pass | pass | pending | pending | `/exercises/v1/lumbar/e27/start.svg`; both knees flexed and both feet supported; pelvis region unobstructed |
| e27 Dead bug con deslizamiento de talón | end | pass | pass | pass | pass | pass | programmatic-svg-v1 · 1200×900 · `48ff666243b48bd6f4b1bcbe355be2c4de567c0c0ee6464507f68d33e5c7547c` | pending | pass | pass | pending | pending | `/exercises/v1/lumbar/e27/end.svg`; right heel remains on mat and start/end distinction remains obvious at thumbnail size |

## Review rules

- **Movement correspondence:** frame matches the canonical start/end description and cannot be confused with a neighboring exercise.
- **Anatomy:** proportions and joint positions are clinically legible; no missing or duplicated anatomy.
- **Equipment/support:** exact equipment and safe support described by the card; no invented objects.
- **Composition/crop:** all relevant joints, hands, feet, band anchor, mat, or support remain visible.
- **Alt text:** accurately describes position and movement state without promotional or diagnostic language.
- **Provenance/checksum:** generator, card version, dimensions, and SHA-256 recorded in the manifest and this ledger.
- **Result:** only `pass`, `fail`, or `pending`. A failed row cannot be shipped.
- **Thumbnail observability:** start/end sequences must remain distinguishable without labels at the smallest product thumbnail; otherwise reject or change media mode.

Technical QA does not substitute for independent clinical or product-owner approval. No row may be changed to final `pass` automatically by the generator or by a test suite.
