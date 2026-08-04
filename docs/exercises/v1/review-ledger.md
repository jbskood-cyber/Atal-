# Atal Exercise Image Pilot — Review Ledger

**Status:** draft preparation; no image has been generated or approved yet.

Approval requires independent visual, clinical, accessibility, and product-owner review. A blank or pending field is a release blocker.

| Exercise | Frame | Movement correspondence | Anatomy | Equipment / support | Composition / crop | Alt text | Provenance / checksum | Clinical | Visual | Accessibility | Product owner | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| e01 Sentadilla asistida | start | pending | pending | pending | pending | prepared | pending | pending | pending | pending | pending | pending | Reserved path: `/exercises/v1/knee/e01/start.webp` |
| e01 Sentadilla asistida | end | pending | pending | pending | pending | prepared | pending | pending | pending | pending | pending | pending | Reserved path: `/exercises/v1/knee/e01/end.webp` |
| e14 Rotación externa con banda | start | pending | pending | pending | pending | prepared | pending | pending | pending | pending | pending | pending | Reserved path: `/exercises/v1/shoulder/e14/start.webp` |
| e14 Rotación externa con banda | end | pending | pending | pending | pending | prepared | pending | pending | pending | pending | pending | pending | Reserved path: `/exercises/v1/shoulder/e14/end.webp` |
| e27 Dead bug con deslizamiento de talón | start | pending | pending | pending | pending | prepared | pending | pending | pending | pending | pending | pending | Reserved path: `/exercises/v1/lumbar/e27/start.webp` |
| e27 Dead bug con deslizamiento de talón | end | pending | pending | pending | pending | prepared | pending | pending | pending | pending | pending | pending | Reserved path: `/exercises/v1/lumbar/e27/end.webp`; right heel must remain on mat and start/end must be distinguishable at thumbnail size |

## Review rules

- **Movement correspondence:** frame matches the canonical start/end description and cannot be confused with a neighboring exercise.
- **Anatomy:** realistic proportions and joint positions; no missing, duplicated, or distorted anatomy.
- **Equipment/support:** exact equipment and safe support described by the card; no invented objects.
- **Composition/crop:** all relevant joints, hands, feet, band anchor, mat, or support remain visible.
- **Alt text:** accurately describes position and movement state without promotional or diagnostic language.
- **Provenance/checksum:** generator/model, date, card version, dimensions, bytes, and SHA-256 recorded.
- **Result:** only `pass`, `fail`, or `pending`. A failed row cannot be shipped.
- **Thumbnail observability:** start/end sequences must remain distinguishable without labels at the smallest product thumbnail; otherwise reject or change media mode.

No row may be changed to `pass` automatically by the image generator or by a test suite.
