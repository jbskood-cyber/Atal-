# Atal Exercise Image Pilot — Review Ledger

**Status:** six pilot frames generated as accessible programmatic SVG drafts; independent clinical, visual, thumbnail, accessibility, and product-owner review remains required.

Approval requires independent visual, clinical, accessibility, and product-owner review. A blank or pending field is a release blocker.

| Exercise | Frame | Movement correspondence | Anatomy | Equipment / support | Composition / crop | Alt text | Provenance / checksum | Clinical | Visual | Accessibility | Product owner | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| e01 Sentadilla asistida | start | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `39ed05653087733c9f32ab615d484ca8de40b2b73fc79b8cbdddca43990dfc2a` | pending | pending | pending | pending | pending | `/exercises/v1/knee/e01/start.svg`; card v1 |
| e01 Sentadilla asistida | end | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `ade69f50df51848d7df2efd3c39fb3adb4b319a3a02478f6e67cdbcf325f7f99` | pending | pending | pending | pending | pending | `/exercises/v1/knee/e01/end.svg`; shallow squat and supported heels require review |
| e14 Rotación externa con banda | start | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `eda74f5929889233cee17380ce0f4a642aa36d1e1824f14bd68a63a9a2887bec` | pending | pending | pending | pending | pending | `/exercises/v1/shoulder/e14/start.svg`; card v1 |
| e14 Rotación externa con banda | end | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `7bbc1d7cbc670e1d389633811116e09b1073b17eddc3bf55178105e11b62bf4a` | pending | pending | pending | pending | pending | `/exercises/v1/shoulder/e14/end.svg`; elbow-at-side and trunk stability require review |
| e27 Dead bug con deslizamiento de talón | start | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `800223d9447a1de930d2bea9c64eaf8a77c9ed8b01c88f24e3cd8e94f78338b6` | pending | pending | pending | pending | pending | `/exercises/v1/lumbar/e27/start.svg`; card v1 |
| e27 Dead bug con deslizamiento de talón | end | pending | pending | pending | pending | prepared | programmatic-svg-v1 · 1200×900 · `1fa8ec8affae872eaf9ebc85fdeeedeb15aa7dbfb80b7ece43a0f083bdd8a293` | pending | pending | pending | pending | pending | `/exercises/v1/lumbar/e27/end.svg`; right heel contact and thumbnail distinction require review |

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
