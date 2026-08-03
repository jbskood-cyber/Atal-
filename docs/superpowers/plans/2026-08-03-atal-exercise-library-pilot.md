# Atal Exercise Library Image Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare and validate a three-exercise clinical-image pilot for Atal without changing protected product behavior, `atal:store:v2`, existing exercise IDs, or generating the remaining 57 exercise assets.

**Architecture:** Keep the 60-exercise catalog specification in PR #25 as the design source. Create a separate stacked pilot branch containing only the reusable production skill, three canonical exercise cards, a draft versioned manifest, deterministic generation requests, and a review ledger. Image files remain draft assets until visual, clinical, and accessibility review; no draft asset may become the application default.

**Tech Stack:** Markdown, YAML, JSON, WebP asset contract, GitHub versioning, existing `ExerciseMediaRef` (`image | video | animation | sequence | none`, `mediaId`, `thumbnailId`).

## Global Constraints

- Do not modify `main`, FOCO, PR #20, PR #22, PR #24, Action Core, Gemini runtime, or `atal:store:v2`.
- Base the pilot branch on the approved design branch `feature/atal-exercise-library-80-20-design`.
- Keep PR #25 open, draft, and unmerged as the design source.
- Pilot exercises are exactly: `e01` Sentadilla asistida, `e14` Rotación externa con banda, and `e25` Basculación pélvica en decúbito supino.
- All three pilot exercises use two-frame `sequence` media: `start` and `end`.
- One consistent synthetic adult model, cool-white studio, navy/blue unbranded clothing, and stable camera treatment across every frame.
- No text, arrows, logos, watermarks, pain overlays, diagnoses, therapist, or unlisted equipment in images.
- Generated images remain `draft`; no process may set `approved` automatically.
- Image bytes stay outside `atal:store:v2`; product entities reference only stable `mediaId` and optional `thumbnailId`.
- Do not generate the other 57 exercise assets in this plan.

---

## File Map

### Production workflow
- Create `skills/atal-exercise-asset-production/SKILL.md`: validates canonical cards, builds constrained generation requests, defines rejection rules, and enforces human approval.

### Canonical pilot cards
- Create `docs/exercises/v1/cards/e01.yaml`: assisted-squat movement contract.
- Create `docs/exercises/v1/cards/e14.yaml`: band external-rotation movement contract.
- Create `docs/exercises/v1/cards/e25.yaml`: supine pelvic-tilt movement contract.

### Generation requests and evidence
- Create `docs/exercises/v1/generation/e01-request.md`.
- Create `docs/exercises/v1/generation/e14-request.md`.
- Create `docs/exercises/v1/generation/e25-request.md`.
- Create `docs/exercises/v1/review-ledger.md`.

### Manifest
- Create `public/exercises/v1/manifest.json`: schema-valid draft entries for the three sequences, with no fabricated asset checksums.

### Validation
- Create `tests/exercise-asset-pilot-contract.test.mjs`: source-contract checks for IDs, frame roles, paths, statuses, and forbidden automatic approval.

---

### Task 1: Create the guarded production skill

**Files:**
- Create: `skills/atal-exercise-asset-production/SKILL.md`

**Interfaces:**
- Consumes: one canonical YAML exercise card containing `exerciseId`, `slug`, `version`, `startingPosition`, `movement`, `keyCues`, `avoidShowing`, `requiredEquipment`, `mediaMode`, `frames`, and `altText`.
- Produces: one deterministic generation request per exercise and a draft manifest proposal.

- [ ] **Step 1: Write the skill contract**

Require the workflow to stop when a card is incomplete, when `mediaMode` is not `image` or `sequence`, or when start/end descriptions are ambiguous. Lock the pilot visual system and require human visual, clinical, and accessibility review.

- [ ] **Step 2: Add deterministic naming rules**

Use:

```text
mediaId: ex-v1-<exerciseId>-sequence
thumbnailId: ex-v1-<exerciseId>-thumb
frame id: ex-v1-<exerciseId>-<start|end>
asset path: /exercises/v1/<region>/<exerciseId>/<start|end>.webp
```

- [ ] **Step 3: Add rejection rules**

Reject wrong movement, impossible anatomy, cropped relevant joints, unsafe support, wrong equipment, inconsistent person/clothing/camera, indistinguishable frames, violated cues, or any embedded text/logo/diagnosis.

- [ ] **Step 4: Commit**

```bash
git add skills/atal-exercise-asset-production/SKILL.md
git commit -m "docs: add guarded exercise asset production skill"
```

### Task 2: Create the three canonical pilot cards

**Files:**
- Create: `docs/exercises/v1/cards/e01.yaml`
- Create: `docs/exercises/v1/cards/e14.yaml`
- Create: `docs/exercises/v1/cards/e25.yaml`

**Interfaces:**
- Produces complete cards consumed by the production skill and review ledger.

- [ ] **Step 1: Create `e01` assisted-squat card**

Lock a three-quarter side view, stable rail, hip-width stance, shallow controlled squat, supported heels, and knees aligned with feet. Explicitly forbid deep forced range, knee collapse, unstable furniture, and pain expression.

- [ ] **Step 2: Create `e14` band external-rotation card**

Lock an upright standing position, elbows flexed approximately 90 degrees and kept close to the torso, neutral wrists, band anchored safely at hand level, and controlled outward forearm rotation without trunk rotation or shoulder elevation.

- [ ] **Step 3: Create `e25` supine pelvic-tilt card**

Lock a supine position, knees flexed, feet supported, arms relaxed, neutral start, and a subtle posterior pelvic tilt that gently reduces the lumbar gap without lifting the pelvis into a bridge.

- [ ] **Step 4: Validate all required fields manually**

Each card must include Spanish alt text for both frames and `reviewStatus: draft` with clinical, visual, and accessibility reviewers pending.

- [ ] **Step 5: Commit**

```bash
git add docs/exercises/v1/cards
git commit -m "docs: add canonical cards for exercise image pilot"
```

### Task 3: Write deterministic generation requests

**Files:**
- Create: `docs/exercises/v1/generation/e01-request.md`
- Create: `docs/exercises/v1/generation/e14-request.md`
- Create: `docs/exercises/v1/generation/e25-request.md`

**Interfaces:**
- Consumes: the matching canonical card.
- Produces: one start-frame prompt and one end-frame prompt sharing an identical style lock.

- [ ] **Step 1: Add the shared style lock to every request**

Specify the same synthetic adult model, navy shirt and shorts, cool-white clinical studio, diffuse natural lighting, realistic anatomy, unbranded equipment, no text or overlays, and matching camera/lens/crop across the two frames.

- [ ] **Step 2: Add frame-specific movement instructions**

The start prompt shows only the canonical start. The end prompt changes only the movement state and preserves identity, clothing, environment, equipment, and camera.

- [ ] **Step 3: Add a negative checklist**

Include every card-specific `avoidShowing` item plus global rejection rules.

- [ ] **Step 4: Commit**

```bash
git add docs/exercises/v1/generation
git commit -m "docs: add deterministic pilot image requests"
```

### Task 4: Create the draft manifest and review ledger

**Files:**
- Create: `public/exercises/v1/manifest.json`
- Create: `docs/exercises/v1/review-ledger.md`

**Interfaces:**
- Produces stable `mediaId` records for later resolver integration.

- [ ] **Step 1: Add three draft sequence records**

Each manifest entry must include `schemaVersion`, `catalogVersion`, `mediaId`, `exerciseId`, `slug`, `type: sequence`, `status: draft`, `thumbnailId`, two frames, alt text, card version, generator field, and review fields.

- [ ] **Step 2: Avoid fabricated provenance**

Before images exist, set `generator` to `pending`, omit checksum values, and keep asset paths reserved but not represented as approved or available.

- [ ] **Step 3: Create the review ledger**

Add one row per frame with columns: exercise, frame, movement correspondence, anatomy, equipment/support, composition, accessibility, provenance/checksum, clinical reviewer, visual reviewer, accessibility reviewer, result, and notes.

- [ ] **Step 4: Commit**

```bash
git add public/exercises/v1/manifest.json docs/exercises/v1/review-ledger.md
git commit -m "docs: add draft pilot manifest and review ledger"
```

### Task 5: Add source-contract validation

**Files:**
- Create: `tests/exercise-asset-pilot-contract.test.mjs`

**Interfaces:**
- Validates the static pilot contract before any image or product integration.

- [ ] **Step 1: Write the failing test before creating all artifacts**

The test must assert:

```js
const expectedIds = ['e01', 'e14', 'e25'];
const expectedFrames = ['start', 'end'];
```

It must verify exactly three manifest entries, unique `mediaId` values, `type === 'sequence'`, `status === 'draft'`, two frame roles in order, frame paths ending in `.webp`, matching card files, non-empty frame alt text, and no string `status: approved` in the skill or cards.

- [ ] **Step 2: Run and confirm RED**

Run:

```bash
node --test tests/exercise-asset-pilot-contract.test.mjs
```

Expected: FAIL until skill, cards, requests, manifest, and ledger exist.

- [ ] **Step 3: Run and confirm GREEN after Tasks 1–4**

Run:

```bash
node --test tests/exercise-asset-pilot-contract.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Run repository belts**

Run:

```bash
npm run quality
```

Expected: typecheck, Node tests, and build PASS. Existing Behavior and E2E workflows must remain green because no protected product runtime is changed.

- [ ] **Step 5: Commit**

```bash
git add tests/exercise-asset-pilot-contract.test.mjs
git commit -m "test: validate exercise image pilot contract"
```

### Task 6: Generate and review only the six pilot frames

**Files:**
- Add after generation: `public/exercises/v1/<region>/<exerciseId>/start.webp`
- Add after generation: `public/exercises/v1/<region>/<exerciseId>/end.webp`
- Modify after generation: `public/exercises/v1/manifest.json`
- Modify after review: `docs/exercises/v1/review-ledger.md`

**Interfaces:**
- Consumes the canonical cards and generation requests.
- Produces six draft WebP files and evidence; it does not approve them automatically.

- [ ] **Step 1: Generate exactly six frames**

Use the project skill and matching request files. Do not generate any other exercise.

- [ ] **Step 2: Reject mismatched generations immediately**

Do not preserve a candidate that violates any rejection criterion. Record rejected attempts only as short ledger notes without shipping them as product assets.

- [ ] **Step 3: Optimize accepted candidates**

Export WebP with intrinsic dimensions recorded in the manifest. Target each frame at or below 220 KB while keeping relevant joints clearly visible.

- [ ] **Step 4: Record real provenance**

Set generator/model, creation date, card version, dimensions, byte size, and SHA-256 checksum for each accepted draft frame.

- [ ] **Step 5: Complete three reviews**

Visual, clinical, and accessibility reviewers must each record pass/fail. Keep the manifest `status: draft` until all three pass and product-owner approval is explicit.

- [ ] **Step 6: Commit the draft pilot**

```bash
git add public/exercises/v1 docs/exercises/v1/review-ledger.md
git commit -m "assets: add draft three-exercise image pilot"
```

### Task 7: Stop at the owner-review boundary

- [ ] Verify the branch contains only the plan, skill, cards, requests, draft manifest, tests, ledger, and at most six pilot frames.
- [ ] Confirm no source file under the private application, `atal:store:v2`, Action Core, Gemini runtime, or landing was modified.
- [ ] Keep the pilot PR draft and unmerged.
- [ ] Present the six frames with the review ledger to the product owner.
- [ ] Do not generate the remaining 57 exercises or integrate the manifest into selector/detail/session/delivery until explicit approval.

## Self-Review Result

- Spec coverage: pilot cards, production skill, naming, manifest, provenance, review, performance, accessibility, and stop boundary are covered.
- Placeholder scan: no `TBD`, `TODO`, automatic approval, or undefined asset state is permitted.
- Type consistency: `e01`, `e14`, `e25`, `sequence`, `start`, `end`, `mediaId`, and `thumbnailId` remain consistent across tasks.
- Scope: limited to pilot preparation and six draft frames; product resolver integration is intentionally deferred to a separate plan after visual approval.
