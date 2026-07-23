# Block 4.1 — Test and acceptance matrix

## 1. Acceptance rule

No single signal is sufficient. Block 4.1 requires all of the following:

1. clean installation;
2. typecheck;
3. all automated tests;
4. production build;
5. CI on the final SHA;
6. deterministic core behavior tests;
7. manual regression of existing non-AI workflows;
8. manual Atal AI functional validation;
9. persisted-data reload validation;
10. final Git/PR integrity check.

A source-inspection assertion may protect architecture, but it does not replace a behavioral test. An HTTP 200 does not replace browser interaction. A passing browser flow does not replace rollback and ambiguity tests.

## 2. Required environments

### Automated

- Node 24.
- Clean `npm ci` using `package-lock.json`.
- No secrets required for core tests.
- CI runner with no persisted browser data.

### Runtime/manual

- Mobile viewport: 390 px primary.
- Additional smoke widths: 360, 412 and 430 px.
- Light and Graphite Clinical modes.
- Local demo data only.
- Gemini may be used for end-to-end proposal generation when configured, but deterministic execution tests must not depend on Gemini availability.

## 3. Baseline gates

| ID | Check | Command | Pass criterion |
|---|---|---|---|
| B-01 | Clean install | `npm ci` | exit 0; no lockfile change |
| B-02 | Typecheck | `npm run typecheck` | exit 0 |
| B-03 | Automated suite | `npm test` | all tests pass; count reported |
| B-04 | Production build | `npm run build` | exit 0 |
| B-05 | Diff hygiene | `git diff --check origin/main...HEAD` | no whitespace errors |
| B-06 | Working tree | `git status --short --branch` | no tracked changes after validation |
| B-07 | CI | GitHub `quality` check | success on final SHA |
| B-08 | Store constants | automated assertion | key remains `atal:store:v2`, version remains `2` |

The existing 43 tests must remain present and passing. New tests increase the count; they do not replace or disable baseline tests.

## 4. Contract and registry tests

| ID | Scenario | Expected |
|---|---|---|
| C-01 | Stable serialization with reordered object keys | same serialization/fingerprint |
| C-02 | Changed validated input | different fingerprint |
| C-03 | Changed entity reference | different fingerprint |
| C-04 | Duplicate tool registration | registry construction fails |
| C-05 | Unknown tool | `CORE_TOOL_UNKNOWN` |
| C-06 | Mutating tool marked `read` | registry construction fails |
| C-07 | Read tool declares undo | registry construction fails |
| C-08 | Every current command/intent mapped | exactly one registered tool or documented query path |
| C-09 | Model input includes fake risk | ignored; registry risk wins |
| C-10 | External tool | blocked without mutation |

## 5. Entity resolution tests

Fixtures must include ambiguous normalized names and invalid cross-entity relationships.

| ID | Scenario | Expected |
|---|---|---|
| R-01 | Valid explicit patient ID | resolves that patient |
| R-02 | Invalid explicit ID plus valid label | not found; no fallback |
| R-03 | No explicit ID, valid selected patient | resolves selected patient |
| R-04 | Unique exact label with accents/case differences | resolves unique entity |
| R-05 | Two patients normalize to same label | clarification with both candidates |
| R-06 | Plan label unique globally but belongs to other resolved patient | relation invalid |
| R-07 | Exercise name duplicated across regions without region | clarification |
| R-08 | Session belongs to a different patient/plan pair | relation invalid |
| R-09 | Missing required entity | clarification/not found |
| R-10 | Write with fuzzy partial label only | no execution |
| R-11 | Search query with many matches | up to 5 results; no context mutation |
| R-12 | Resolver receives frozen state | no mutation/throw from attempted write |

## 6. Risk and confirmation tests

| ID | Risk | Without proof | Valid proof | Invalid/stale proof |
|---|---|---|---|---|
| P-01 | `read` | executes | proof ignored | n/a |
| P-02 | `draft` | returns review state | remains draft/review | n/a |
| P-03 | `reversible-write` | confirmation/review required | executes | stale/fingerprint mismatch blocked |
| P-04 | `sensitive-write` | explicit confirmation required | executes | standard review proof rejected |
| P-05 | `destructive` | reinforced confirmation required | only reinforced accepted | explicit/review rejected |
| P-06 | `external` | blocked | still blocked | still blocked |

Additional cases:

- confirmation expires after 5 minutes;
- changed input invalidates confirmation;
- changed selected entity invalidates confirmation;
- successful mutation consumes proof in conversation flow;
- failed validation does not create success/audit or consume user-visible proposal state;
- UI copy names exact tool action and entity for sensitive writes.

## 7. Transaction and rollback tests

For every failure case, compare full pre/post state by deep equality and inspect persisted storage/event counts.

| ID | Injection point | Expected |
|---|---|---|
| T-01 | Successful single-entity write | one store mutation, invariant pass, one transaction audit |
| T-02 | Successful composite patient/record/plan/exercises | all entities commit together |
| T-03 | Input validation failure | no store mutation |
| T-04 | Entity resolution failure | no store mutation |
| T-05 | Version conflict | no store mutation/audit |
| T-06 | Precondition failure | candidate discarded |
| T-07 | Throw after patient creation | no patient/record/plan/exercise persists |
| T-08 | Throw after exercise creation | no partial exercise persists |
| T-09 | Invariant failure after executor | candidate discarded |
| T-10 | `localStorage.setItem` failure | in-memory cache restored; no emitted committed state |
| T-11 | Successful mutation | exactly one transaction-level audit event |
| T-12 | Failed mutation | zero transaction-level audit events |
| T-13 | Executor attempts nested store transaction | test/protection rejects architecture bypass |
| T-14 | Read tool | state, store updatedAt, events and notifications unchanged |

## 8. State invariant tests

| ID | Invalid candidate | Expected code |
|---|---|---|
| I-01 | Duplicate patient IDs | `CORE_INVARIANT_FAILED` |
| I-02 | Plan references missing patient | `CORE_INVARIANT_FAILED` |
| I-03 | Plan references missing exercise | `CORE_INVARIANT_FAILED` |
| I-04 | Record references missing patient | `CORE_INVARIANT_FAILED` |
| I-05 | Record plan belongs to another patient | `CORE_INVARIANT_FAILED` |
| I-06 | Session patient/plan mismatch | `CORE_INVARIANT_FAILED` |
| I-07 | Two active plans for one patient | `CORE_INVARIANT_FAILED` |
| I-08 | Active plan has no exercises | `CORE_INVARIANT_FAILED` |
| I-09 | Exercise sets below 1 | `CORE_INVARIANT_FAILED` |
| I-10 | Existing entity ID/createdAt changed | `CORE_INVARIANT_FAILED` or precondition failure |
| I-11 | Record update skips or double increments version | `CORE_INVARIANT_FAILED` |
| I-12 | Record updated without one previous snapshot | `CORE_INVARIANT_FAILED` |

## 9. Undo tests

| ID | Scenario | Expected |
|---|---|---|
| U-01 | Restore updated plan within 30 s | previous values restored atomically |
| U-02 | Restore updated record | record and version bookkeeping valid |
| U-03 | Undo newly added note | exact note removed |
| U-04 | Undo replace-active | both plans restored |
| U-05 | Undo composite new patient/record/plan/exercises | all transaction-created data removed in safe order |
| U-06 | Created exercise later referenced elsewhere | `CORE_UNDO_STALE`; nothing removed |
| U-07 | Entity changed after transaction | `CORE_UNDO_STALE` |
| U-08 | Receipt expired | `CORE_UNDO_EXPIRED` |
| U-09 | Receipt already consumed | rejected |
| U-10 | Successful undo | one `outcome: undone` audit; original unrelated events preserved |
| U-11 | Undo would violate invariant | rollback undo; current state unchanged |

## 10. Tool behavior matrix

### Queries

| ID | Tool | Case | Expected |
|---|---|---|---|
| Q-01 | `patient.search` | matching query | max 5 concise results; no mutation |
| Q-02 | `patient.search` | no match | deterministic no-results message |
| Q-03 | `patient.summarize` | valid patient | patient/record/active-plan summary |
| Q-04 | `session.summarize_recent` | no sessions | deterministic no-sessions message |
| Q-05 | `session.summarize_recent` | sessions | bounded latest list and correct aggregate |
| Q-06 | `report.prepare_session_summary` | unique session | reviewable summary, no persisted report |
| Q-07 | report by patient with multiple sessions | clarification, not arbitrary first session |

### Draft/composite writes

| ID | Tool | Case | Expected |
|---|---|---|---|
| D-01 | `patient.create_with_record_and_plan` | complete valid draft | patient/record/exercises/plan created atomically |
| D-02 | same | exact existing patient name | clarification before create |
| D-03 | same | active plan with no exercise | rejected/rollback |
| D-04 | `patient_record.update` | valid reviewed draft | patient/record updated; one version snapshot |
| D-05 | same | stale base version | conflict; no mutation |
| D-06 | `plan.create_for_patient` | patient already has active plan and new active requested | conflict; no second active plan |
| D-07 | `plan.update` | plan belongs to different patient | relation invalid |
| D-08 | `exercise.create` | exact reusable library exercise | reuse when requested; no duplicate |
| D-09 | `exercise.create` | explicit create-new | creates intentionally; summary states it |
| D-10 | `exercise.update` | valid | same ID/createdAt; updatedAt changes |

### Direct writes

| ID | Tool | Case | Expected |
|---|---|---|---|
| W-01 | `patient_note.add` | valid | note + audit; undo available |
| W-02 | same | blank | input invalid |
| W-03 | `plan.activate` | no active conflict | explicit confirmation then active |
| W-04 | same | active conflict | reject; require replace tool |
| W-05 | `plan.pause` | active | review then paused |
| W-06 | `plan.pause` | draft/completed | precondition fail |
| W-07 | `plan.complete` | active/paused | explicit confirmation then completed |
| W-08 | `plan.archive` | active | reject until pause/complete |
| W-09 | `plan.restore` | archived | restores to draft |
| W-10 | `plan.replace_active` | valid same patient | old paused, target active, one transaction |
| W-11 | `settings.update` | allowlisted keys | only keys changed; undo available |
| W-12 | `settings.update` | profile/unknown key | input invalid |
| W-13 | `data.export_local` | confirmed | download descriptor, no network, no direct DOM click in tool |

## 11. Legacy adapter tests

| ID | Scenario | Expected |
|---|---|---|
| A-01 | Every `AICommandType` | exact registry mapping |
| A-02 | Every mutating `AtalAIIntent` | exact registry mapping |
| A-03 | Unknown/unsupported legacy value | blocked/error, no fallback mutation |
| A-04 | Existing selected IDs | copied to entity references/context |
| A-05 | Draft base versions | preserved for conflict validation |
| A-06 | Existing Apply action | produces valid review proof for exact proposal |
| A-07 | Force/keep version action | new proposal/fingerprint; invariants still enforced |
| A-08 | Legacy `applyAtalAIDraft` | no direct `mutateAtalStore` call |
| A-09 | Legacy command registry | no direct store mutation/download logic |
| A-10 | Old result shape | patient/plan IDs, summary, href and undo remain UI-compatible |

## 12. Manual non-AI regression

Use a clean demo state and a persisted-state copy. Record PASS/FAIL for each.

| ID | Flow |
|---|---|
| M-01 | Create patient with record manually |
| M-02 | Edit patient manually |
| M-03 | Archive and restore patient manually |
| M-04 | Create plan manually |
| M-05 | Edit plan manually |
| M-06 | Activate plan and resolve existing-active conflict through current UI |
| M-07 | Pause, complete, archive and restore plan |
| M-08 | Create/edit/archive exercise manually |
| M-09 | Prevent deleting an exercise used by a plan |
| M-10 | Guided session start/completion/partial persistence |
| M-11 | Review session report and observation |
| M-12 | Settings save and theme persistence |
| M-13 | Reload preserves `atal:store:v2` entities |
| M-14 | Existing legacy local-data merge path still typechecks/tests |

## 13. Manual Atal AI functional QA

### Query

- Search for a patient and verify no state/event change.
- Summarize a selected patient.
- Ask for recent sessions.
- Ask for a report when multiple sessions exist; verify clarification.

### Draft

- Generate or load a draft.
- Expand, edit, save section, contract, reopen and reload.
- Verify real data unchanged before Apply.
- Cancel a temporary edit and confirm it is discarded.

### Reversible write

- Add a patient note or pause a plan.
- Verify review/apply gate.
- Verify success summary, audit and undo.
- Execute undo within expiry and verify exact restoration.

### Sensitive write

- Attempt plan activation/completion/archive or local export.
- Verify exact explicit confirmation.
- Change target/input before confirming and verify old confirmation is invalid.
- Confirm and verify result.

### Ambiguity

- Create/use demo entities with same normalized patient label.
- Ask to update by label only.
- Verify candidates are shown and no mutation occurs until exact selection/new proposal.

### Conflict

- Prepare a draft, manually update the target entity, then Apply.
- Verify version conflict and zero mutation.

## 14. Visual regression

Block 4.1 is not a redesign. At 390 px verify:

- Atal AI header, conversation, draft and composer retain approved hierarchy;
- draft expand/edit/save/cancel behavior remains intact;
- clarification and confirmation states fit without double scroll;
- bottom navigation remains hidden in modal/editor contexts as before;
- keyboard does not cover actions;
- official green remains `#7EB695` where already approved;
- no emerald glow/pulse returns;
- light and Graphite Clinical modes remain legible;
- no new generic desktop card layout appears.

Smoke at 360, 412 and 430 px.

## 15. Privacy and audit inspection

Inspect persisted `atal:store:v2`, AI conversations and activity events after representative operations.

Pass only when:

- no attachment base64 appears in audit events;
- no phone/email/address/emergency contact appears in transaction audit;
- no prompt/hidden reasoning appears;
- audit includes transaction/tool/risk/affected IDs/outcome;
- failed or blocked operations create no success audit;
- local export makes no network request;
- console contains no unexpected clinical payload logging.

## 16. Performance/build observations

The known pre-block production bundle warning near 606.97 kB is non-blocking for 4.1. Acceptance requires:

- no new large runtime dependency;
- no material bundle increase without explanation;
- registry/tool modules remain tree-shakeable and avoid importing UI libraries;
- navigation remains responsive in manual smoke testing.

Report final bundle size and delta from baseline.

## 17. Evidence required in draft PR

- final SHA;
- clean working tree;
- CI status;
- Node/npm versions;
- install/typecheck/test/build results and exact test count;
- automated cases added by category;
- old command/intent → new tool mapping;
- rollback and undo evidence;
- ambiguity and stale-confirmation evidence;
- manual non-AI regression results;
- manual Atal AI results;
- screenshots for draft, clarification, confirmation, success and undo;
- console/network/privacy findings;
- bundle size/delta;
- known limitations.

## 18. Final conclusion vocabulary

Independent validation must use one:

- `BLOCK 4.1 APPROVED`
- `BLOCK 4.1 BLOCKED — PRODUCT FAILURE`
- `BLOCK 4.1 BLOCKED — VALIDATION ENVIRONMENT`

The implementation worker does not issue the final approval and does not merge the PR.
