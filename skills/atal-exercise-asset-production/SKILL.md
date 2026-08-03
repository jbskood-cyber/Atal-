---
name: atal-exercise-asset-production
description: Produce reviewable Atal exercise images from approved canonical cards. Use only for the bounded pilot or an explicitly approved catalog batch.
---

# Atal Exercise Asset Production

## Purpose

Create exercise-specific media that corresponds to an approved canonical exercise card while preserving stable `exerciseId`/`mediaId` references, accessibility metadata, provenance, and human review. This skill produces **draft** assets only.

## Hard gates

Stop without generating when any of these are true:

- the canonical card is missing;
- `exerciseId`, `slug`, `version`, `startingPosition`, `movement.start`, `movement.end`, `keyCues`, `avoidShowing`, `requiredEquipment`, `mediaMode`, `frames`, or `altText` is incomplete;
- `mediaMode` is not `image` or `sequence`;
- the movement cannot be distinguished reliably in one or two static frames;
- the requested equipment or support is ambiguous or unsafe;
- the request attempts to diagnose, prescribe candidacy, promise outcomes, or replace clinician judgment;
- the request is outside the explicitly approved exercise IDs or batch size.

Never mark an asset `approved`. Visual, clinical, accessibility, and product-owner review are external gates.

## Inputs

Read one YAML card from `docs/exercises/v1/cards/<exerciseId>.yaml`.

Required card fields:

```yaml
exerciseId: e01
slug: knee-assisted-squat
version: 1
locale: es-MX
name: Sentadilla asistida
region: knee
category: Fuerza y control
startingPosition:
  body: ...
  support: ...
  camera: ...
movement:
  start: ...
  end: ...
keyCues: []
avoidShowing: []
laterality: neutral
requiredEquipment: []
mediaMode: sequence
frames: [start, end]
altText:
  start: ...
  end: ...
reviewStatus: draft
```

## Locked visual system

For the pilot, every frame must use:

- the same synthetic adult model with neutral, non-identifying appearance;
- navy short-sleeve athletic shirt and navy/blue shorts, no branding;
- cool-white clinical studio background;
- soft diffuse lighting and realistic skin/anatomy;
- no theatrical fitness advertising;
- no text, arrows, anatomy overlays, red pain areas, diagnoses, logos, watermarks, or decorative medical props;
- camera angle, crop, model identity, clothing, lighting, and equipment unchanged between start/end frames;
- all joints and supports needed to understand the movement fully visible.

## Deterministic identifiers

```text
mediaId      ex-v1-<exerciseId>-sequence
thumbnailId  ex-v1-<exerciseId>-thumb
frameId      ex-v1-<exerciseId>-<start|end>
path         /exercises/v1/<region>/<exerciseId>/<start|end>.webp
```

## Generation procedure

1. Validate the canonical card against the hard gates.
2. Copy the locked visual system into both frame prompts.
3. Build the start prompt from `startingPosition` and `movement.start` only.
4. Build the end prompt by changing only the movement state to `movement.end`.
5. Include every `keyCues` item as visible form constraints.
6. Include every `avoidShowing` item and global rejection rule as negative constraints.
7. Generate only the explicitly approved number of frames.
8. Compare every candidate against the card before retaining it.
9. Export retained candidates as WebP with intrinsic dimensions.
10. Record generator/model, creation date, card version, dimensions, bytes, and SHA-256 checksum.
11. Keep manifest status `draft` and add the candidate to the review ledger.

## Rejection criteria

Reject and regenerate when any of these occur:

- wrong exercise or wrong frame;
- impossible anatomy, duplicated/missing limbs or digits, or distorted joints;
- relevant joint, foot, hand, support, band anchor, or equipment is cropped;
- equipment differs from the card or appears unsafe;
- start and end frames are indistinguishable;
- person, clothing, background, lighting, camera, or crop changes between frames;
- a `keyCue` is visibly violated;
- an `avoidShowing` condition appears;
- the asset could reasonably be confused with another exercise;
- text, arrows, labels, logos, watermarks, diagnosis claims, pain graphics, or invented medical equipment appear.

## Alt text

Use the card's frame-specific alt text. Do not describe color, style, beauty, or promotional qualities unless needed to understand the movement. Alt text must identify position, support/equipment, and the movement state.

## Review output

For every retained frame, create or update one ledger row containing:

- exercise and frame;
- movement correspondence;
- anatomy;
- equipment/support;
- composition/cropping;
- accessibility/alt text;
- provenance/checksum;
- clinical reviewer;
- visual reviewer;
- accessibility reviewer;
- result and notes.

An asset remains draft until all reviews pass and the product owner explicitly approves it.
