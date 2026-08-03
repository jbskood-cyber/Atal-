# Atal Exercise Library 80/20 with Clinical Images — Design Specification

**Status:** proposed for product-owner review  
**Date:** 2026-08-02  
**Branch:** `feature/atal-exercise-library-80-20-design`  
**Protected base:** Block 9 branch at `d0a576c6337de0899121689be964055ff076ef74`  
**Scope:** design/specification only; no product code, generated image, seed mutation, merge, or deployment is authorized by this document.

## 1. Purpose

Atal currently exposes a library of 14 demonstration exercises. The canonical `ExerciseEntity` already supports:

```ts
type ExerciseMediaRef = {
  type: 'image' | 'video' | 'animation' | 'sequence' | 'none';
  mediaId?: string;
  thumbnailId?: string;
};
```

However, the seeded entries are created with `media: { type: 'image' }` and no `mediaId`. The old demonstration source also rotates four generic Unsplash fitness photographs that do not prove correspondence between the displayed movement and the exercise. The result is a visual fallback rather than a clinically trustworthy exercise illustration.

This project will define a compact, high-utility musculoskeletal exercise pack and a production system for creating, reviewing, versioning, resolving, and displaying exercise-specific media without altering the protected Behavior System or breaking `atal:store:v2`.

“80/20” is a product-prioritization label, not a clinical coverage claim. It means selecting a deliberately small first pack that is reusable across common ambulatory musculoskeletal plans. It does **not** mean that these exercises are appropriate for 80% of patients or replace professional assessment.

## 2. Non-goals

This project does not:

- prescribe treatment or choose exercises automatically for a diagnosis;
- claim clinical efficacy, diagnostic accuracy, or universal suitability;
- replace the physiotherapist's judgment;
- add a public marketplace or user-uploaded media platform;
- introduce video generation in the first release;
- rewrite Action Core, Gemini behavior, plan membership, or `atal:store:v2`;
- overwrite local exercises or user-edited clinical content;
- generate the full media pack before the product owner approves the spec and pilot direction.

## 3. Current-state findings

### 3.1 Existing seed catalog

The current demonstration catalog contains 14 entries:

1. Sentadilla asistida
2. Elevación de pierna recta
3. Puente de glúteos
4. Clamshell
5. Step Up
6. Elevación de talones
7. Bird Dog
8. Plancha lateral
9. Wall Sit
10. Estiramiento de isquiotibia
11. Movilización de cadera 90/90
12. Curl nórdico asistido
13. Retracción escapular
14. Rotación externa con banda

### 3.2 Current media gap

- `ExerciseMediaRef` can reference `image`, `video`, `animation`, `sequence`, or `none`.
- Seeded `ExerciseEntity` records have `type: 'image'` but no durable `mediaId`.
- The demo data's four external photographs are generic and reused across unrelated movements.
- `atal:store:v2` stores exercise metadata, but image bytes should not be embedded in localStorage.
- Existing plans reference exercises by stable `exerciseIds`; those IDs must not be replaced casually.

### 3.3 Clinical-safety boundary

The pack is a library of clinician-selectable movement templates. Every exercise requires individual selection, dosing, precautions, and adaptation by the treating professional. Images communicate form; they do not determine candidacy.

## 4. Design approaches considered

### Approach A — Replace all 14 seeds with a new catalog and new IDs

**Advantages**

- clean taxonomy;
- consistent identifiers;
- easiest implementation on a fresh install.

**Costs and risks**

- breaks existing plan references;
- may duplicate or orphan persisted seed exercises;
- violates continuity of `atal:store:v2`;
- increases migration risk for little user value.

**Decision:** rejected.

### Approach B — Keep the 14 seeds, attach verified media, and add 16 complementary exercises

**Advantages**

- preserves every existing ID and plan membership;
- reaches balanced coverage with 30 total movements;
- supports an idempotent additive upgrade;
- keeps scope small enough for manual media QA.

**Costs and risks**

- legacy names/taxonomy need normalization rules;
- some regions contain more advanced exercises than a minimal first-line pack;
- requires a manifest that maps old IDs and new IDs consistently.

**Decision:** recommended.

### Approach C — Build a very large condition-specific library first

**Advantages**

- broad choice;
- easier to market as “complete.”

**Costs and risks**

- poor image-review scalability;
- higher chance of mismatched or unsafe illustrations;
- duplicated movements and inconsistent naming;
- delays useful delivery and creates false completeness.

**Decision:** rejected for the first release.

## 5. Recommended product strategy

Adopt **Approach B**:

- preserve `e01`–`e14`;
- attach verified media by stable `mediaId`;
- add `e15`–`e30` as complementary seed entries;
- keep all user-created exercises untouched;
- ship media through a versioned static manifest, not inside `atal:store:v2`;
- use a two-frame `sequence` for movements where start/end distinction materially improves comprehension;
- use one `image` only for static holds or positions where a second frame adds no useful information;
- require human exercise↔media approval before an asset becomes production-eligible.

## 6. First pack: exact 30-exercise catalog

The first pack balances five regions: shoulder, lumbar/lumbopelvic control, hip, knee, and ankle. Existing IDs are retained. New IDs continue the current scheme only for compatibility; the manifest also carries a semantic slug.

### 6.1 Shoulder — 6

| ID | Exercise | Category | Media | Level role |
|---|---|---|---|---|
| `e13` | Retracción escapular | motor control | sequence | foundation |
| `e14` | Rotación externa con banda | strength/stability | sequence | progression |
| `e15` | Péndulo de hombro | mobility | sequence | regression/foundation |
| `e16` | Deslizamiento de brazos en pared | mobility/control | sequence | foundation |
| `e17` | Elevación en plano escapular sin carga | mobility/control | sequence | foundation |
| `e18` | Empuje serrato en pared | strength/control | sequence | progression |

### 6.2 Lumbar and lumbopelvic control — 6

| ID | Exercise | Category | Media | Level role |
|---|---|---|---|---|
| `e07` | Bird Dog | stability | sequence | progression |
| `e08` | Plancha lateral con apoyo de rodillas | stability | image or sequence | progression |
| `e19` | Basculación pélvica en decúbito supino | motor control | sequence | foundation |
| `e20` | Cat–camel | mobility | sequence | foundation |
| `e21` | Dead bug con deslizamiento de talón | stability | sequence | foundation/progression |
| `e22` | Bisagra de cadera con bastón | motor control | sequence | functional progression |

### 6.3 Hip — 6

| ID | Exercise | Category | Media | Level role |
|---|---|---|---|---|
| `e03` | Puente de glúteos | strength | sequence | foundation |
| `e04` | Clamshell | stability | sequence | foundation |
| `e11` | Movilización de cadera 90/90 | mobility | sequence | progression |
| `e23` | Abducción de cadera de pie con apoyo | strength/control | sequence | foundation |
| `e24` | Caminata lateral con banda | strength/stability | sequence | progression |
| `e25` | Estiramiento de flexor de cadera en media rodilla | flexibility | image | mobility option |

### 6.4 Knee — 6

| ID | Exercise | Category | Media | Level role |
|---|---|---|---|---|
| `e01` | Sentadilla asistida | strength/control | sequence | foundation |
| `e02` | Elevación de pierna recta | strength | sequence | foundation |
| `e05` | Step up bajo | strength/function | sequence | progression |
| `e09` | Wall sit | endurance | image | progression |
| `e12` | Curl nórdico asistido | strength | sequence | advanced optional |
| `e26` | Extensión terminal de rodilla con banda | strength/control | sequence | foundation |

### 6.5 Ankle — 6

| ID | Exercise | Category | Media | Level role |
|---|---|---|---|---|
| `e06` | Elevación de talones con apoyo | strength | sequence | foundation |
| `e27` | Movilidad de tobillo rodilla-a-pared | mobility | sequence | foundation |
| `e28` | Dorsiflexión de tobillo con banda | strength | sequence | foundation |
| `e29` | Eversión de tobillo con banda | strength/control | sequence | foundation |
| `e30` | Equilibrio unipodal con apoyo cercano | balance | image | foundation/progression |
| `e10` | Estiramiento de cadena posterior de pie | flexibility | image | mobility option |

### 6.6 Selection rationale

An exercise qualifies for the first pack when it meets most of these criteria:

- reusable across multiple ambulatory plan contexts;
- understandable with one or two frames;
- low equipment burden;
- easy to regress or progress;
- practical for home use after clinician instruction;
- visually distinguishable from neighboring exercises;
- no need for specialized apparatus;
- compatible with Atal's existing sets/repetitions/time/rest model.

The pack intentionally avoids condition-specific protocols, high-skill plyometrics, heavy loading, manual therapy, cervical manipulation, unstable-surface novelty exercises, and movements that are difficult to represent safely in a static image.

## 7. Canonical exercise card

Before media production, every exercise must have a canonical card. No prompt may be sent to an image generator without a completed card.

```yaml
exerciseId: e01
slug: knee-assisted-squat
version: 1
locale: es-MX
name: Sentadilla asistida
region: Rodilla
category: Fuerza y control
purpose: Demonstrate the movement pattern only; clinician selects suitability and dose.
startingPosition:
  body: standing, feet hip-width apart
  support: both hands lightly holding a stable rail
  camera: three-quarter side view
movement:
  start: upright neutral stance
  end: controlled shallow squat with knees aligned over feet
keyCues:
  - trunk controlled
  - heels remain supported
  - knees track in line with feet
avoidShowing:
  - deep forced range
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
  start: Persona de pie sujetando una barra estable antes de iniciar una sentadilla asistida.
  end: Persona realizando una sentadilla asistida poco profunda con pies y rodillas alineados.
reviewStatus: draft
reviewers:
  clinical: pending
  visual: pending
```

## 8. Project skill design

### 8.1 Proposed path

`skills/atal-exercise-asset-production/SKILL.md`

The skill is proposed in this spec but must not be created or invoked for production assets until the product owner approves this design.

### 8.2 Skill responsibilities

The skill must:

1. read the canonical exercise card;
2. reject incomplete cards;
3. select `image` vs `sequence` according to the card;
4. build a constrained image-generation prompt;
5. preserve a consistent visual system;
6. create deterministic filenames and manifest entries;
7. run a structured self-check;
8. require human clinical and visual review;
9. never mark an asset `approved` automatically.

### 8.3 Locked visual system

- one consistent adult model for the pilot, with neutral and non-identifying appearance;
- plain cool-white clinical studio background;
- navy/blue athletic clothing with no logo and sufficient body-joint visibility;
- full body or region-appropriate crop with all relevant joints visible;
- camera height and angle defined by the canonical card;
- natural proportions and five digits per visible hand/foot where visible;
- no text baked into the image;
- no arrows, red pain areas, anatomy overlays, diagnostic labels, watermarks, brand marks, or medical devices not listed in the card;
- no exaggerated smiles, pain expressions, or theatrical “fitness advertising” pose;
- no clinician in frame unless an exercise specifically requires physical assistance, which is outside the first pack.

### 8.4 Prompt contract

Every production prompt must include:

- exercise ID and semantic name;
- exact start/end frame;
- body position and support surface;
- camera angle and crop;
- limb visibility and laterality;
- permitted equipment;
- clothing/background lock;
- explicit negative constraints;
- instruction that the image demonstrates form and makes no clinical claim.

### 8.5 Mandatory rejection criteria

Reject and regenerate when any of the following occurs:

- wrong movement or wrong frame;
- missing, duplicated, or anatomically impossible limb;
- required joint or support surface cropped out;
- unsafe or unstable support;
- start and end frames are visually indistinguishable;
- inconsistent person, clothing, setting, camera angle, or equipment across a sequence;
- invented band attachment, machine, weight, brace, or therapist;
- embedded text, arrows, labels, watermarks, or brand;
- pose contradicts canonical cues;
- asset could plausibly represent another exercise in the same pack.

## 9. Asset manifest

### 9.1 Proposed location

- manifest: `public/exercises/v1/manifest.json`
- images: `public/exercises/v1/<region>/<exercise-id>/`
- source cards: `docs/exercises/v1/cards/<exercise-id>.yaml`
- review ledger: `docs/exercises/v1/review-ledger.md`

### 9.2 Manifest schema

```json
{
  "schemaVersion": 1,
  "catalogVersion": "2026.08.1",
  "generatedAt": "2026-08-02T00:00:00.000Z",
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
          "alt": "Persona de pie sujetando una barra estable antes de iniciar una sentadilla asistida."
        },
        {
          "id": "ex-v1-e01-end",
          "role": "end",
          "src": "/exercises/v1/knee/e01/end.webp",
          "width": 1200,
          "height": 900,
          "bytes": 0,
          "sha256": "pending",
          "alt": "Persona realizando una sentadilla asistida poco profunda con pies y rodillas alineados."
        }
      ],
      "provenance": {
        "method": "generated",
        "generator": "approved-image-workflow",
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

### 9.3 Status lifecycle

`draft → visual-reviewed → clinical-reviewed → approved → retired`

Only `approved` assets may be returned by the production resolver. Draft or missing assets resolve to the existing neutral fallback.

## 10. Runtime architecture

### 10.1 Separation of concerns

1. `ExerciseEntity.media` remains the lightweight reference inside `atal:store:v2`.
2. Static image bytes remain outside localStorage.
3. A pure `exerciseMediaCatalog` reads the bundled manifest.
4. A resolver maps `mediaId` to approved assets.
5. UI components receive a resolved presentation object, never raw manifest internals.

Proposed interface:

```ts
type ResolvedExerciseMedia =
  | { status: 'ready'; type: 'image'; thumbnail: MediaFrame; frames: [MediaFrame] }
  | { status: 'ready'; type: 'sequence'; thumbnail: MediaFrame; frames: [MediaFrame, MediaFrame] }
  | { status: 'fallback'; reason: 'missing' | 'unapproved' | 'invalid' | 'load-error' };

resolveExerciseMedia(exercise: ExerciseEntity): ResolvedExerciseMedia;
```

### 10.2 Seed upgrade without breaking `atal:store:v2`

No store-version bump is required because `mediaId` and `thumbnailId` already exist in the current type.

The future implementation must use an idempotent additive reconciler:

- preserve `e01`–`e14` IDs;
- add missing `e15`–`e30` seed records;
- attach `mediaId` only when a seed exercise has no media ID;
- never replace a `source: 'local'` exercise;
- never overwrite an existing user-selected media reference;
- never reorder or rewrite existing `plan.exerciseIds`;
- preserve archived status and timestamps for persisted entries;
- record catalog version separately from `AtalState.version` if runtime migration bookkeeping is needed.

### 10.3 Consumer surfaces

The same resolver must power:

- exercise library selector;
- exercise detail/editor preview;
- plan exercise list;
- guided session exercise step;
- patient plan/delivery view;
- print/PDF delivery when images are included.

No surface may independently construct image URLs from exercise names.

## 11. Storage, caching, and performance

### 11.1 Formats

- source master: lossless PNG or project-controlled original;
- production primary: WebP;
- optional AVIF only when build/browser support and visual comparison are verified;
- intrinsic width/height required to prevent layout shift;
- no base64 data URLs in `atal:store:v2` or component source.

### 11.2 Budget

Pilot target per frame:

- thumbnail: ≤40 KB;
- mobile/detail frame: ≤120 KB;
- sequence total: ≤240 KB;
- no automatic prefetch of the full 30-exercise pack.

The library list loads thumbnails. Full frames load only when a card enters the viewport or the exercise detail/session step opens.

### 11.3 PWA behavior

- app-shell cache must not eagerly cache every full-resolution asset;
- approved thumbnails may use stale-while-revalidate;
- guided-session frames may be cached on demand after plan opening;
- missing/offline images keep instructions and show the neutral fallback;
- media failure must never block session completion, plan access, or delivery text.

## 12. Accessibility

- every frame has Spanish alt text describing body position and movement state, not decorative style;
- paired frames expose `Inicio` and `Final` labels outside the image;
- alt text must not repeat the full written exercise instructions;
- no essential cue may depend only on color;
- swipe/carousel cannot be the only way to change frames;
- sequence controls require keyboard and screen-reader operation;
- reduced motion disables animated crossfades or auto-advance;
- fallback preserves the exercise name, position, steps, precautions, and dose.

## 13. Privacy, provenance, and licensing

- use no real patient image or uploaded clinical photo in the seed pack;
- generated people must be synthetic and non-identifying;
- store prompt, generator/model identifier, date, card version, checksum, and review status;
- do not use generic web images, scraped images, stock photographs with unclear exercise correspondence, or assets without durable usage rights;
- do not imply endorsement by a professional association;
- do not depict protected logos, branded clothing, clinic names, or personal data;
- retiring an asset must preserve its historical manifest entry and replacement reference.

## 14. QA plan

### 14.1 Manifest and resolver tests

- every production `mediaId` is unique;
- every `exerciseId` maps to at most one active approved media entry per catalog version;
- referenced files exist and match declared dimensions/checksum;
- no `approved` entry has pending review fields;
- an unapproved or missing media ID returns fallback;
- an invalid manifest cannot crash the product;
- local exercise media references remain untouched.

### 14.2 Exercise↔image correspondence review

For every asset, reviewers answer:

1. Does the image show the named exercise?
2. Is it the correct start/end frame?
3. Are all relevant joints and supports visible?
4. Does the depicted equipment match the card?
5. Is alignment consistent with the card's key cues?
6. Is the sequence internally consistent?
7. Could it be confused with another catalog exercise?
8. Does the alt text accurately describe the frame?
9. Is there any unsafe, impossible, or clinically misleading detail?
10. Is the asset free of text, branding, diagnosis, and outcome claims?

Any “no” blocks approval.

### 14.3 Product flow QA

At minimum, Playwright verifies:

- library selector shows the correct thumbnail for each pilot exercise;
- selecting the exercise keeps the same `exerciseId` and `mediaId` in the plan draft;
- exercise detail shows start/end frames in order;
- guided session shows the same approved asset and continues if loading fails;
- patient delivery shows the same exercise and never swaps assets between IDs;
- hard reload preserves exercise membership and resolves media again from the manifest;
- archived/local exercises retain their existing behavior;
- mobile viewports 360×800 and 390×844 have no horizontal overflow;
- dark/light themes preserve visibility without modifying the image itself.

## 15. Pilot proposal — blocked until owner review

The first pilot should contain three exercises chosen to stress different visual and runtime requirements:

1. **`e01` Sentadilla asistida** — lower-limb compound movement, stable support, start/end sequence.
2. **`e14` Rotación externa con banda** — shoulder movement, band anchoring and lateral alignment, start/end sequence.
3. **`e19` Basculación pélvica en decúbito supino** — subtle lumbopelvic movement where camera angle and visual clarity are challenging.

The pilot validates the workflow, not the entire catalog. It must produce:

- three canonical cards;
- six primary frames (two per exercise unless self-review justifies a single frame);
- three thumbnails;
- one draft manifest;
- correspondence checklist results;
- screenshots from selector, detail, guided session, and patient delivery;
- a rejection/regeneration log where applicable.

No pilot asset may be integrated as `approved` until the product owner reviews the visual direction.

## 16. Clinical evidence boundary

The catalog structure is informed by broad rehabilitation principles rather than condition-specific prescription. Relevant evidence sources include:

- Desmeules et al., *Rotator Cuff Tendinopathy Diagnosis, Nonsurgical Medical Care, and Rehabilitation: A Clinical Practice Guideline*, JOSPT 2025, DOI `10.2519/jospt.2025.13182`.
- George et al., *Interventions for the Management of Acute and Chronic Low Back Pain: Revision 2021*, JOSPT 2021.
- Lawford et al., *Exercise for osteoarthritis of the knee*, Cochrane Database of Systematic Reviews 2024, DOI `10.1002/14651858.CD004376.pub4`.

These sources support exercise as a clinician-directed intervention category. They do not validate this exact 30-item product pack or make every movement suitable for every condition.

## 17. Acceptance criteria for the design phase

The design phase is complete when:

- current seed/media architecture is documented accurately;
- two or more strategies and their trade-offs are recorded;
- one strategy is recommended;
- the exact 30-exercise pack is defined;
- the canonical card and skill contract are defined;
- manifest, resolver, store-preservation, caching, accessibility, privacy, provenance, and QA contracts are explicit;
- the pilot is scoped but not generated;
- placeholder scan finds no unresolved design decision required before owner review;
- no product file, image asset, protected PR, or store schema has been modified.

## 18. Self-review

### Placeholder scan

No `TBD`, `TODO`, or unspecified first-pack exercise remains. Review statuses inside example data are intentional lifecycle values, not missing design decisions.

### Internal consistency

- IDs `e01`–`e14` are preserved.
- New seeds are additive.
- media stays external to localStorage.
- only approved assets resolve in production.
- pilot generation remains gated by owner review.

### Scope check

The spec covers one bounded subsystem: seed exercise catalog + exercise-specific media production and resolution. Video, user uploads, condition protocols, and automated prescription remain out of scope.

### Ambiguity check

- “80/20” is explicitly non-clinical.
- static `image` vs two-frame `sequence` is decided per catalog row.
- local exercises and existing media are never overwritten.
- pilot approval does not authorize the full 30-exercise generation run.

## 19. Approval boundary

Approval of this spec authorizes the next step only: writing a task-level implementation plan and producing the three-exercise **draft pilot** in an isolated branch.

It does not authorize:

- full-pack generation;
- merge or deployment;
- replacement of existing exercise IDs;
- automatic media approval;
- changes to PR #20, PR #22, landing branches, `main`, Action Core, Gemini runtime, or `atal:store:v2` schema.
