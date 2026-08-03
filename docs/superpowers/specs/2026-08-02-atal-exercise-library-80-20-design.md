# Atal Exercise Library 80/20 with Clinical Images — Design Specification

**Status:** revised for product-owner review  
**Date:** 2026-08-03  
**Branch:** `feature/atal-exercise-library-80-20-design`  
**Protected base:** Block 9 / PR #22  
**Scope:** design/specification only. This document does not authorize merge, deployment, full-pack image generation, or changes to protected branches.

## 1. Purpose

Atal currently exposes 14 seeded exercises. `ExerciseEntity.media` already supports `image`, `video`, `animation`, `sequence`, `none`, `mediaId`, and `thumbnailId`, but the seed records use `type: image` without a durable `mediaId`. The legacy demo also reuses a few generic photographs between unrelated movements.

This specification defines:

1. an exact 60-exercise ambulatory musculoskeletal base pack;
2. a preservation-first upgrade that keeps existing IDs and plans intact;
3. a canonical global image layer for every approved exercise;
4. an optional request-generated variant layer;
5. a project skill and QA process for producing clinically corresponding images;
6. a three-exercise pilot before any mass generation.

“80/20” is a product-prioritization label. It is not a claim that the pack is appropriate for 80% of patients.

## 2. Safety and non-goals

The library is clinician-selectable. It does not diagnose, prescribe automatically, select candidacy, or replace professional judgment.

This project does not:

- create condition-specific protocols;
- claim treatment efficacy or clinical outcomes;
- overwrite local exercises or user-edited content;
- replace `e01`–`e14`;
- place image bytes in `atal:store:v2`;
- change Action Core, Gemini runtime, plan membership semantics, PR #20, PR #22, landing branches, or `main`;
- approve generated media automatically;
- generate the full pack before pilot review.

## 3. Current-state findings

### 3.1 Existing seeds

The current catalog contains:

`e01` Sentadilla asistida  
`e02` Elevación de pierna recta  
`e03` Puente de glúteos  
`e04` Clamshell  
`e05` Step up  
`e06` Elevación de talones  
`e07` Bird dog  
`e08` Plancha lateral  
`e09` Wall sit  
`e10` Estiramiento de isquiotibia  
`e11` Movilización de cadera 90/90  
`e12` Curl nórdico asistido  
`e13` Retracción escapular  
`e14` Rotación externa con banda

### 3.2 Media gap

- existing seeds lack durable `mediaId`;
- generic photos do not prove exercise correspondence;
- existing plans depend on stable `exerciseIds`;
- the correct upgrade is additive and idempotent;
- media bytes must remain outside localStorage.

## 4. Approaches considered

### Approach A — Replace all seeds

Clean taxonomy, but breaks plan references and persisted continuity. **Rejected.**

### Approach B — Preserve 14 seeds and expand to 60

Preserves IDs, provides broader foundational coverage, supports progressions/regressions, and remains small enough for controlled QA. **Recommended.**

### Approach C — Large condition-specific library

Broader on paper but harder to review, more duplicative, and likely to imply false completeness. **Deferred.**

## 5. Recommended strategy

Adopt Approach B:

- preserve `e01`–`e14`;
- add `e15`–`e60`;
- use 12 exercises per region;
- attach media only through stable `mediaId`;
- store approved assets in a versioned static manifest;
- use one image for static positions and two-frame sequences for meaningful movement;
- require visual, clinical, and accessibility review;
- separate canonical global assets from generated request variants.

## 6. Exact first pack — 60 exercises

The pack covers five regions with 12 exercises each. It prioritizes mobility, motor control, strength, endurance, balance, and functional patterns with low equipment burden.

### 6.1 Shoulder — 12

| ID | Exercise | Category | Media | Role |
|---|---|---|---|---|
| `e13` | Retracción escapular | control motor | sequence | foundation |
| `e14` | Rotación externa con banda | fuerza/estabilidad | sequence | progression |
| `e15` | Péndulo de hombro | movilidad | sequence | regression |
| `e16` | Deslizamiento de brazos en pared | movilidad/control | sequence | foundation |
| `e17` | Elevación en plano escapular sin carga | movilidad/control | sequence | foundation |
| `e18` | Empuje serrato en pared | fuerza/control | sequence | foundation |
| `e19` | Flexión asistida de hombro con bastón | movilidad | sequence | regression |
| `e20` | Rotación externa asistida con bastón | movilidad | sequence | regression |
| `e21` | Remo con banda | fuerza/postura | sequence | foundation |
| `e22` | Isométrico de rotación externa contra pared | fuerza | image | foundation |
| `e23` | Isométrico de abducción contra pared | fuerza | image | foundation |
| `e24` | Elevación en Y inclinada sin carga | control escapular | sequence | progression |

### 6.2 Columna y control lumbopélvico — 12

| ID | Exercise | Category | Media | Role |
|---|---|---|---|---|
| `e07` | Bird dog | estabilidad | sequence | progression |
| `e08` | Plancha lateral con apoyo de rodillas | estabilidad | sequence | progression |
| `e25` | Basculación pélvica en decúbito supino | control motor | sequence | foundation |
| `e26` | Cat-camel | movilidad | sequence | foundation |
| `e27` | Dead bug con deslizamiento de talón | estabilidad | sequence | foundation |
| `e28` | Bisagra de cadera con bastón | control motor | sequence | functional |
| `e29` | Respiración diafragmática en decúbito | control | image | regression |
| `e30` | Activación abdominal con marcha supina | estabilidad | sequence | foundation |
| `e31` | Rotación lumbar en decúbito con rodillas flexionadas | movilidad | sequence | foundation |
| `e32` | Extensión lumbar de pie con apoyo | movilidad | sequence | option |
| `e33` | Puente corto con marcha alterna | estabilidad | sequence | progression |
| `e34` | Plancha frontal con apoyo de rodillas | estabilidad | image | progression |

### 6.3 Cadera — 12

| ID | Exercise | Category | Media | Role |
|---|---|---|---|---|
| `e03` | Puente de glúteos | fuerza | sequence | foundation |
| `e04` | Clamshell | estabilidad | sequence | foundation |
| `e11` | Movilización de cadera 90/90 | movilidad | sequence | progression |
| `e35` | Abducción de cadera de pie con apoyo | fuerza/control | sequence | foundation |
| `e36` | Caminata lateral con banda | fuerza/estabilidad | sequence | progression |
| `e37` | Estiramiento de flexor de cadera en media rodilla | flexibilidad | image | mobility |
| `e38` | Extensión de cadera de pie con apoyo | fuerza | sequence | foundation |
| `e39` | Aducción de cadera en decúbito lateral | fuerza | sequence | foundation |
| `e40` | Rotación interna de cadera sentada con banda | fuerza/control | sequence | progression |
| `e41` | Transferencia de peso lateral | control funcional | sequence | regression |
| `e42` | Sit-to-stand desde silla alta | fuerza/función | sequence | foundation |
| `e43` | Step lateral bajo con apoyo | fuerza/control | sequence | progression |

### 6.4 Rodilla — 12

| ID | Exercise | Category | Media | Role |
|---|---|---|---|---|
| `e01` | Sentadilla asistida | fuerza/control | sequence | foundation |
| `e02` | Elevación de pierna recta | fuerza | sequence | foundation |
| `e05` | Step up bajo | fuerza/función | sequence | progression |
| `e09` | Wall sit | resistencia | image | progression |
| `e10` | Estiramiento de isquiotibiales | flexibilidad | image | mobility |
| `e12` | Curl nórdico asistido | fuerza | sequence | advanced |
| `e44` | Extensión terminal de rodilla con banda | fuerza/control | sequence | foundation |
| `e45` | Extensión de rodilla sentada sin carga | movilidad/fuerza | sequence | regression |
| `e46` | Flexión de rodilla de pie con apoyo | movilidad/fuerza | sequence | foundation |
| `e47` | Mini sentadilla contra pared con pelota | fuerza/control | sequence | foundation |
| `e48` | Descenso controlado de escalón bajo | fuerza excéntrica | sequence | progression |
| `e49` | Desplazamiento posterior de cadera con apoyo | control funcional | sequence | foundation |

### 6.5 Tobillo y pie — 12

| ID | Exercise | Category | Media | Role |
|---|---|---|---|---|
| `e06` | Elevación de talones con apoyo | fuerza | sequence | foundation |
| `e50` | Movilidad de tobillo rodilla-a-pared | movilidad | sequence | foundation |
| `e51` | Dorsiflexión de tobillo con banda | fuerza | sequence | foundation |
| `e52` | Eversión de tobillo con banda | fuerza/control | sequence | foundation |
| `e53` | Inversión de tobillo con banda | fuerza/control | sequence | foundation |
| `e54` | Equilibrio unipodal con apoyo cercano | balance | image | foundation |
| `e55` | Elevación de punta de pies con apoyo | fuerza | sequence | foundation |
| `e56` | Estiramiento de gastrocnemio en pared | flexibilidad | image | mobility |
| `e57` | Estiramiento de sóleo en pared | flexibilidad | image | mobility |
| `e58` | Doming del arco plantar | control del pie | sequence | foundation |
| `e59` | Separación activa de dedos del pie | control del pie | sequence | foundation |
| `e60` | Transferencia talón-punta con apoyo | control funcional | sequence | regression |

## 7. Selection criteria

An exercise belongs in the base pack when it meets most of these conditions:

- reusable across multiple ambulatory contexts;
- easy to understand with one or two frames;
- low equipment requirement;
- practical for home use after clinician instruction;
- supports a clear regression or progression;
- visually distinguishable from neighboring exercises;
- compatible with sets, repetitions, time, rest, load, laterality, and tolerance;
- does not require a specialist apparatus or a clinician physically in frame.

The pack intentionally excludes manipulation, manual therapy, high-skill plyometrics, heavy-loading protocols, unstable-surface novelty, diagnosis-specific tests, and movements too subtle to represent reliably without video.

## 8. Canonical exercise card

No image generation request may run without a completed card.

```yaml
exerciseId: e01
slug: knee-assisted-squat
version: 1
locale: es-MX
name: Sentadilla asistida
region: Rodilla
category: Fuerza y control
purpose: Demonstrate movement form only; the clinician selects suitability and dose.
startingPosition:
  body: standing, feet hip-width apart
  support: both hands lightly holding a stable rail
  camera: three-quarter side view
movement:
  start: upright neutral stance
  end: controlled shallow squat with knees aligned over feet
keyCues:
  - trunk controlled
  - heels supported
  - knees aligned with feet
avoidShowing:
  - forced deep range
  - knee collapse
  - unstable furniture
  - pain expression
laterality: neutral
requiredEquipment:
  - stable rail
mediaMode: sequence
frames:
  - start
  - end
altText:
  start: Persona de pie sujetando una barra estable antes de una sentadilla asistida.
  end: Persona realizando una sentadilla asistida poco profunda con rodillas alineadas.
reviewStatus: draft
reviewers:
  clinical: pending
  visual: pending
  accessibility: pending
```

## 9. Image system: two layers

### 9.1 Canonical global layer

Every production exercise has one approved canonical media record. This is the default asset used by:

- library selector;
- exercise detail;
- plan views;
- guided sessions;
- patient delivery;
- print/PDF when images are enabled.

Canonical assets are stable, versioned, reviewed, and referenced through `mediaId`.

### 9.2 Request-generated variant layer

A separate optional layer may produce a variant for a specific request, for example:

- different permitted equipment;
- left/right laterality;
- seated or supported regression;
- different safe camera view;
- approved demographic presentation.

The request flow may be initiated by Atal IA or another product surface, but the generation job is an explicit media-production request. ChatGPT is the primary generation workflow; Gemini may prepare or route the request. A generated variant:

- receives a unique `variantId`;
- references the canonical `exerciseId`;
- never silently replaces canonical media;
- remains `draft` until reviewed;
- cannot be used in production delivery while unapproved;
- records prompt, generator/model, date, card version, checksum, and provenance.

## 10. Project skill

**Proposed path:** `skills/atal-exercise-asset-production/SKILL.md`

The skill must:

1. read and validate a canonical card;
2. reject incomplete or ambiguous cards;
3. choose `image` or `sequence`;
4. generate constrained prompts;
5. preserve model, clothing, background, camera, and equipment consistency;
6. generate deterministic filenames and manifest records;
7. run a visual self-check;
8. create alt text from the card, not from style;
9. require human visual, clinical, and accessibility review;
10. never mark an asset approved automatically.

### 10.1 Locked pilot visual system

- one consistent synthetic adult model;
- neutral, non-identifying appearance;
- cool-white clinical studio;
- navy/blue unbranded clothing;
- relevant joints fully visible;
- region-appropriate crop;
- no text, arrows, pain overlays, diagnoses, watermarks, logos, or decorative medical props;
- no theatrical fitness advertising;
- no invented brace, therapist, anchor, weight, or machine.

### 10.2 Rejection criteria

Regenerate when:

- movement or frame is wrong;
- anatomy is impossible;
- a relevant joint or support is cropped;
- equipment differs from the card;
- support is unsafe;
- start and end are indistinguishable;
- person, clothing, setting, or camera changes across frames;
- the pose violates a key cue;
- the asset could be confused with another exercise;
- text, labels, logos, watermarks, or diagnosis claims appear.

## 11. Asset manifest

### 11.1 Locations

- `public/exercises/v1/manifest.json`
- `public/exercises/v1/<region>/<exercise-id>/`
- `docs/exercises/v1/cards/<exercise-id>.yaml`
- `docs/exercises/v1/review-ledger.md`

### 11.2 Canonical asset record

```json
{
  "schemaVersion": 1,
  "catalogVersion": "2026.08.2",
  "assets": [
    {
      "mediaId": "ex-v1-e01-sequence",
      "exerciseId": "e01",
      "slug": "knee-assisted-squat",
      "type": "sequence",
      "status": "draft",
      "thumbnailId": "ex-v1-e01-thumb",
      "frames": [
        {
          "id": "ex-v1-e01-start",
          "role": "start",
          "src": "/exercises/v1/knee/e01/start.webp",
          "width": 1200,
          "height": 900,
          "bytes": 0,
          "sha256": "pending",
          "alt": "Persona de pie sujetando una barra estable antes de una sentadilla asistida."
        },
        {
          "id": "ex-v1-e01-end",
          "role": "end",
          "src": "/exercises/v1/knee/e01/end.webp",
          "width": 1200,
          "height": 900,
          "bytes": 0,
          "sha256": "pending",
          "alt": "Persona realizando una sentadilla asistida poco profunda con rodillas alineadas."
        }
      ],
      "provenance": {
        "method": "generated",
        "generator": "chatgpt-approved-image-workflow",
        "sourceCardVersion": 1,
        "license": "project-owned-generated-asset",
        "containsRealPatient": false
      },
      "review": {
        "clinical": "pending",
        "visual": "pending",
        "accessibility": "pending",
        "approvedAt": null
      }
    }
  ]
}
```

### 11.3 Variant record additions

```json
{
  "variantId": "ex-v1-e01-var-supported-chair-left",
  "canonicalMediaId": "ex-v1-e01-sequence",
  "requestSource": "atal-ai",
  "status": "draft",
  "replacesCanonical": false
}
```

### 11.4 Status lifecycle

`draft → visual-reviewed → clinical-reviewed → accessibility-reviewed → approved → retired`

Only approved media resolves in production.

## 12. Runtime architecture

```ts
type ResolvedExerciseMedia =
  | { status: 'ready'; type: 'image'; thumbnail: MediaFrame; frames: [MediaFrame] }
  | { status: 'ready'; type: 'sequence'; thumbnail: MediaFrame; frames: [MediaFrame, MediaFrame] }
  | { status: 'fallback'; reason: 'missing' | 'unapproved' | 'invalid' | 'load-error' };

resolveExerciseMedia(exercise: ExerciseEntity): ResolvedExerciseMedia;
```

Rules:

- `ExerciseEntity.media` remains a lightweight reference;
- image bytes remain outside localStorage;
- one manifest resolver powers every consumer surface;
- no component constructs URLs from exercise names;
- variants require an explicit selector and never replace canonical media by inference.

## 13. Preservation of `atal:store:v2`

No store-version bump is required because the current type already includes `mediaId` and `thumbnailId`.

The future reconciler must:

- preserve `e01`–`e14`;
- add missing `e15`–`e60`;
- attach `mediaId` only when absent;
- never overwrite `source: local`;
- never overwrite a user-selected media reference;
- never reorder `plan.exerciseIds`;
- preserve archived state and timestamps;
- remain idempotent;
- track catalog version separately when needed.

## 14. Storage, performance, and PWA

- source master: project-controlled lossless original;
- production: WebP;
- intrinsic dimensions required;
- no base64 in store or source code;
- thumbnail target: ≤40 KB;
- detail frame target: ≤120 KB;
- sequence target: ≤240 KB;
- list loads thumbnails only;
- full frames lazy-load;
- approved thumbnails may use stale-while-revalidate;
- guided-session frames may cache after opening a plan;
- missing media never blocks instructions, plan access, session completion, or delivery.

## 15. Accessibility

- Spanish alt text describes body position and frame state;
- paired frames expose visible `Inicio` and `Final` labels;
- controls work with keyboard and screen reader;
- swipe is never the only navigation method;
- reduced motion disables crossfade/auto-advance;
- no essential cue depends on color;
- fallback preserves name, instructions, precautions, and dose.

## 16. Privacy, provenance, and licensing

- no real patient images;
- only synthetic, non-identifying people;
- store generator/model, prompt, date, card version, checksum, license, and review status;
- no scraped or unclear-rights images;
- no third-party logos or clinic identifiers;
- retired assets keep history and replacement references.

## 17. QA

### 17.1 Manifest and resolver

- unique `mediaId` and `variantId`;
- at most one active approved canonical asset per exercise/version;
- referenced files exist and match dimensions/checksum;
- approved entries have no pending review;
- missing/unapproved media returns fallback;
- invalid manifest cannot crash the app;
- local exercise media stays untouched.

### 17.2 Exercise↔image correspondence

Every reviewer answers:

1. Does the image show the named exercise?
2. Is the frame role correct?
3. Are relevant joints and supports visible?
4. Does equipment match?
5. Do alignment and cues match?
6. Are sequence frames consistent?
7. Could it be confused with another exercise?
8. Is alt text accurate?
9. Is any unsafe or impossible detail present?
10. Is it free of text, branding, diagnosis, and outcome claims?

Any “no” blocks approval.

### 17.3 Product flow

Playwright must verify:

- correct pilot thumbnail in library selector;
- stable `exerciseId` and `mediaId` after selection;
- correct frame order in detail;
- same asset in guided session;
- session continues on load failure;
- patient delivery never swaps assets;
- hard reload resolves media again;
- archived/local exercises retain behavior;
- 360×800 and 390×844 have no overflow;
- light/dark themes preserve visibility.

## 18. Three-exercise pilot

The pilot remains:

1. `e01` Sentadilla asistida — compound lower-limb sequence.
2. `e14` Rotación externa con banda — shoulder/band anchoring sequence.
3. `e25` Basculación pélvica en decúbito supino — subtle lumbopelvic sequence.

Pilot deliverables:

- three canonical cards;
- six draft frames;
- three thumbnails;
- one draft manifest;
- correspondence checklists;
- generation/rejection log;
- screenshots in selector, detail, guided session, and patient delivery.

Pilot images remain draft until product-owner review.

## 19. Evidence boundary

The catalog is informed by broad exercise-therapy principles and current clinical practice guidance for shoulder rehabilitation, low-back pain, and knee osteoarthritis. Those sources support clinician-directed exercise as an intervention category; they do not validate this exact 60-item product pack or make every exercise suitable for every patient.

## 20. Design acceptance criteria

The design phase is complete when:

- exact 60-exercise pack is recorded;
- existing IDs and store protections are explicit;
- canonical and request-generated image layers are separated;
- skill, card, manifest, resolver, caching, accessibility, provenance, and QA contracts are explicit;
- pilot is scoped but not mass-generated;
- no placeholders or contradictory IDs remain;
- no protected product branch or store schema has changed.

## 21. Self-review

### Placeholder scan

No unresolved `TBD` or `TODO` remains.

### Internal consistency

- 12 exercises are assigned to each of five regions;
- IDs are unique from `e01` through `e60`;
- `e01`–`e14` remain preserved;
- new exercises are additive;
- canonical media and variants are separate;
- only approved assets resolve in production;
- pilot generation does not authorize the full pack.

### Scope check

The spec remains one subsystem: base exercise catalog plus media production/resolution. Automated prescription, condition protocols, video generation, and user uploads remain out of scope.

### Ambiguity check

- “80/20” is explicitly non-clinical;
- canonical media is the default;
- request variants never silently replace canonical media;
- local exercises and user media are never overwritten.

## 22. Approval boundary

Approval authorizes a task-level implementation plan and the three-exercise draft pilot in an isolated branch.

It does not authorize:

- full-pack generation;
- automatic media approval;
- merge or deployment;
- replacement of existing IDs;
- changes to PR #20, PR #22, landing branches, `main`, Action Core, Gemini runtime, or the `atal:store:v2` schema.
