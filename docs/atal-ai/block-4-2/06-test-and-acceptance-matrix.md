# Block 4.2 — Test and acceptance matrix

## 1. Test strategy

Block 4.2 uses layered verification:

1. unit tests for context, state machine, action availability and deterministic suggestions;
2. integration tests for shell visibility, persistence adapters and Block 4.1 outcomes;
3. existing full automated test suite and production build;
4. deterministic Playwright tests against the direct Vite app;
5. a brief final real-preview smoke for Gemini wiring only when the environment permits.

The source of truth for repeatable product behavior is GitHub Actions. Google AI Studio is not the primary E2E target.

## 2. Baseline preservation

Before product edits and on the final SHA:

| Requirement | Expected |
|---|---|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS, no baseline regression |
| `npm run build` | PASS |
| `ATAL_STORE_KEY` | exactly `atal:store:v2` |
| `ATAL_STORE_VERSION` | exactly `2` |
| package lock | no unexplained dependency change |
| global `/assistant` | functional |
| manual patient/record/plan/exercise/report flows | functional |

## 3. State-machine matrix

| ID | Scenario | Required result |
|---|---|---|
| S01 | Initial page load | workspace closed; nav/orb/actions according to surface |
| S02 | Open from orb | same route/history; exact context; workspace open |
| S03 | Open from exterior quick action | same as S02 plus seeded intent/message |
| S04 | Open state | bottom nav absent; orb absent; exterior actions absent |
| S05 | Minimize | nav/orb/actions restored; session retained |
| S06 | Restore minimized | same conversation, draft pane and internal scroll |
| S07 | Close | transient shell cleared; persisted conversation/draft retained |
| S08 | Close with pending unapplied draft | no product mutation; draft persistence unchanged by policy |
| S09 | Error during open | workspace remains closable; shell can restore nav |
| S10 | Context entity removed | safe unavailable/mismatch state; no write |
| S11 | Route changes while pending proposal | proposal remains bound to original entity and is invalidated/blocked |
| S12 | Browser history | opening/minimize/close adds no entry |

## 4. Navigation, scroll and focus matrix

| ID | Scenario | Required result |
|---|---|---|
| N01 | Open at nonzero page scroll | scroll position does not jump |
| N02 | Scroll attempt on background while open | background remains fixed/inert |
| N03 | Internal conversation scroll | only workspace content scrolls |
| N04 | Minimize | exact page scroll restored within small tolerance |
| N05 | Close | exact page scroll restored within small tolerance |
| N06 | Open by keyboard | focus enters workspace |
| N07 | Minimize/close | focus returns to originating trigger |
| N08 | Tab navigation | no focus reaches inert background |
| N09 | Escape with no nested layer | closes/minimizes according to approved behavior |
| N10 | Escape with confirmation/menu | cancels topmost layer first; never confirms |

## 5. Closed visual state matrix

| ID | Scenario | Required result |
|---|---|---|
| V01 | Patient profile | orb and valid actions visible above nav |
| V02 | Clinical record | exact record/patient context available |
| V03 | Plan | plan-context orb/actions visible |
| V04 | Exercise | exercise-context orb/actions visible |
| V05 | Report | report-context orb/actions visible |
| V06 | Patients list | no contextual trigger unless separately contracted |
| V07 | Settings | no contextual trigger |
| V08 | Primary page action nearby | no overlap or obstruction |
| V09 | 360 px width | no horizontal overflow; actions collapse safely |
| V10 | Graphite | orb/actions readable and integrated |
| V11 | Reduced motion | no continuous pulse/glow |

## 6. Open visual state matrix

| ID | Scenario | Required result |
|---|---|---|
| O01 | First open frame | shell/context visible without waiting for Gemini |
| O02 | Header | symbol, title, exact context chip, minimize, close |
| O03 | Mobile main area | no cramped forced two-column layout |
| O04 | Wider main area | conversation/draft may use balanced side-by-side layout |
| O05 | Empty context conversation | clear empty/ready state, not blank panel |
| O06 | Suggestions loading | compact geometry-matched skeleton or deterministic rows |
| O07 | Draft absent | draft pane not shown as fake empty card |
| O08 | Bottom area | composer fixed inside workspace and nav absent |
| O09 | Underlying page | visible but inert; no accidental tap-through |
| O10 | Theme switch while open | workspace updates without state loss |

## 7. Context identity matrix

| ID | Surface | Required references |
|---|---|---|
| C01 | Patient | patient ID; optional active plan/record IDs |
| C02 | Clinical record | patient ID, record ID, current version |
| C03 | Plan | patient ID, plan ID, plan status/relationship |
| C04 | Exercise in plan | exercise ID, plan ID, patient ID |
| C05 | Standalone exercise | exercise ID; no invented plan/patient |
| C06 | Report | report/session ID, patient ID, plan ID where present |
| C07 | Same label, different IDs | context stays bound to exact ID |
| C08 | Context switch | pending proposal/confirmation cannot silently retarget |

## 8. Contextual actions matrix

| ID | Action class | Required result |
|---|---|---|
| A01 | Read action | query result; full clinical store unchanged |
| A02 | Draft action | draft persistence changes; clinical store unchanged |
| A03 | Reversible write starter | proposal/review first; no direct mutation |
| A04 | Sensitive write starter | explicit confirmation returned by core |
| A05 | Unavailable action | omitted or clearly disabled with reason; no fake success |
| A06 | Exterior vs internal same action | same typed intent/context |
| A07 | Action on missing entity | clarification/unavailable; zero mutation |
| A08 | Ambiguous entity | candidates/clarification; zero mutation |

## 9. Suggestion matrix

| ID | Scenario | Required result |
|---|---|---|
| G01 | Missing patient contact | suggestion appears from deterministic rule |
| G02 | Contact complete | suggestion absent |
| G03 | No initial record/evaluation | appropriate stored-fact suggestion |
| G04 | Active plan has no exercises | plan suggestion appears |
| G05 | Suggestion displayed | no mutation and no success audit |
| G06 | Suggestion action | opens correct intent/context |
| G07 | Dismiss suggestion | no clinical mutation |
| G08 | No rule matched | no invented recommendation |

## 10. Conversation and network matrix

| ID | Scenario | Required result |
|---|---|---|
| M01 | Same context reopen | same contextual thread selected |
| M02 | Different patient | distinct thread/context |
| M03 | Valid read response | renders result; no mutation |
| M04 | Malformed model response | rejected safely; recoverable UI |
| M05 | HTTP failure | error shown; no draft/mutation |
| M06 | Retry | no duplicate transaction or repeated user message |
| M07 | Minimize during request | no shell corruption; result attaches to correct thread/context |
| M08 | Context changes during request | stale response cannot apply to new context |
| M09 | Privacy | no hidden reasoning/private metadata exposed |
| M10 | Global assistant regression | existing `/assistant` query and draft still work |

## 11. Draft and editing matrix

| ID | Scenario | Required result |
|---|---|---|
| D01 | Create patient/record/plan/exercise/report draft | real entity unchanged |
| D02 | Edit draft field/section | draft only |
| D03 | Save section | persists draft and returns to summary |
| D04 | Cancel editor | discards unsaved section changes |
| D05 | One mobile section open | enforced/preserved |
| D06 | Progress percentage | calculated from real completion |
| D07 | Reload | persisted draft recoverable; not auto-applied |
| D08 | Minimize/restore | same draft and active section |
| D09 | Newer manual entity version | conflict; apply disabled |
| D10 | Duplicate target | clarification/block; no duplicate entity |

## 12. Confirmation, execution, audit and undo matrix

| ID | Scenario | Required result |
|---|---|---|
| E01 | Before apply | product store unchanged |
| E02 | Apply reversible proposal | confirmation/review behavior follows registry policy |
| E03 | Cancel confirmation | zero mutation; zero success audit |
| E04 | Confirm current proposal | atomic expected mutation only |
| E05 | Change draft after confirmation | old proof invalid |
| E06 | Change target context after confirmation | old proof invalid |
| E07 | Invariant failure | rollback exact; no partial entity/event/success audit |
| E08 | Success audit | one structured transaction-level record with safe metadata |
| E09 | Audit privacy | excludes phone/email/address/contact/base64/reasoning/secrets |
| E10 | Undo valid | exact prior state restored; outcome recorded |
| E11 | Undo expired | rejected; current state preserved |
| E12 | Undo version mismatch | rejected; current state preserved |
| E13 | Global vs contextual same invocation | equivalent policy/outcome |

## 13. Composer and keyboard matrix

| ID | Scenario | Required result |
|---|---|---|
| K01 | Empty input, voice available | microphone shown; send absent as primary |
| K02 | Text present | send shown; microphone absent as competing primary |
| K03 | Multiline text | bounded growth; no panel overflow |
| K04 | Successful send | input clears exactly once |
| K05 | Recoverable failure | user can retry/edit; no duplicate send |
| K06 | Keyboard open | composer and relevant action visible |
| K07 | Keyboard close | workspace and input state retained |
| K08 | Confirmation with keyboard | confirm/cancel reachable |
| K09 | `+` action | only real available capabilities shown |
| K10 | Cursor/input | stable on Android; no trapped zero/NaN-like behavior |

## 14. Responsive and theme matrix

For each required viewport, test closed and open state in light and Graphite where practical.

| Viewport | Closed | Open | Composer/keyboard | Overflow | Fatal errors |
|---|---|---|---|---|---|
| 360 × 800 | PASS required | PASS required | PASS required | none | none |
| 390 × 844 | PASS required | PASS required | PASS required | none | none |
| 412 × 915 | PASS required | PASS required | PASS required | none | none |
| 430 × 932 | PASS required | PASS required | PASS required | none | none |
| tablet/desktop smoke | usable | usable | usable | none | none |

## 15. Accessibility matrix

| ID | Scenario | Required result |
|---|---|---|
| X01 | Orb accessible name | names Atal IA and current context |
| X02 | Context actions | semantic buttons with names |
| X03 | Workspace label | title and context associated |
| X04 | Focus containment | background inaccessible while open |
| X05 | Minimize/close names | distinct and understandable |
| X06 | Live response | announced politely once |
| X07 | Error/conflict | announced appropriately |
| X08 | Collapsible draft | expanded state exposed |
| X09 | Progress | text/value, not color-only |
| X10 | Reduced motion | motion disabled/reduced |
| X11 | Contrast | readable in both themes |
| X12 | Target size | essential controls at least 44 × 44 CSS px |

## 16. Performance matrix

| ID | Scenario | Required result |
|---|---|---|
| P01 | Clinical page closed | no heavy conversation/draft mount |
| P02 | Open shell | immediate shell; no wait for Gemini |
| P03 | Composer typing | no whole clinical app rerender per keystroke |
| P04 | Store subscriptions | scoped to required snapshots |
| P05 | Navigation between pages | no new multi-second regression |
| P06 | Bundle | measured and documented; no unnecessary large framework |
| P07 | Long conversation | remains responsive for representative fixture |
| P08 | Close after error | scroll lock/nav visibility restored |

## 17. Required Playwright critical suite

The final PR gate must include at least these independent scenarios:

1. **Patient shell lifecycle** — closed/open/minimize/restore/close; nav/orb/actions suppression; route/history/scroll/focus preservation.
2. **Contextual query** — patient summary with full store equality before/after.
3. **Contextual draft** — draft edit/persistence with zero real mutation before apply.
4. **Reversible write** — confirmation, structured safe audit, success and exact undo.
5. **Proof/context invalidation** — target or input change blocks stale confirmation.
6. **Conflict/ambiguity** — stale record and ambiguous identity produce zero partial mutation.
7. **Context adapters** — plan, exercise and report exact IDs/parent relationships.
8. **Responsive/theme/keyboard smoke** — target mobile widths, light/Graphite, no overflow/page errors/console errors.
9. **Regression smoke** — global `/assistant` and representative manual workflow.

Mock only `/api/atal-ai/analyze` or the exact external Gemini boundary. Do not mock the controller under test, registry, policy, transaction, audit, undo or product store.

## 18. Evidence requirements

Post to the PR and issue #15:

- exact final SHA;
- working tree status;
- `npm ci`, typecheck, test count, build result;
- quality workflow run ID/result;
- E2E workflow run ID/result and exact E2E count;
- artifact IDs and retention;
- screenshots/traces for target viewport/theme failures or final matrix as available;
- store key/version confirmation;
- package-lock change explanation or confirmation of no change;
- route/scroll/navigation suppression evidence;
- known limitations;
- PR state open/draft/unmerged.

## 19. Acceptance conclusions

Only these final conclusions are allowed:

- `BLOCK 4.2 APPROVED`
- `BLOCK 4.2 BLOCKED — PRODUCT FAILURE`
- `BLOCK 4.2 BLOCKED — VALIDATION ENVIRONMENT`

Approval requires all mandatory matrices and final-SHA CI evidence. A worker's implementation report alone is not approval.