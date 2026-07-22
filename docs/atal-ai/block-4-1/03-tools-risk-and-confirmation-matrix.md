# Block 4.1 — Tools, risk and confirmation matrix

## 1. Registry rules

Every executable operation must have one stable registry name. Registry names are application API contracts; do not derive them from translated UI copy.

Requirements:

- names use lowercase dot notation;
- every name is unique;
- version is `1` in Block 4.1;
- risk is hard-coded in the tool definition;
- Gemini may provide `tool` and `input`, but any model-provided risk/confirmation flags are ignored;
- unknown tools return `CORE_TOOL_UNKNOWN`;
- external tools return `CORE_EXTERNAL_BLOCKED` in this block;
- a mutating tool cannot be registered with `risk: 'read'`;
- a read-only tool cannot emit an undo receipt;
- a destructive tool cannot execute with a standard review proof.

## 2. Confirmation vocabulary

| Mode | User interaction | Execution rule |
|---|---|---|
| `none` | No confirmation | Only side-effect-free reads with uniquely resolved required entities |
| `review` | Existing draft/action review and explicit Apply button | Reversible writes and draft application |
| `explicit` | Confirmation dialog names exact action and affected entity | Sensitive write or private local export |
| `reinforced` | Confirmation names irreversible consequence and requires a second deliberate action | Destructive operation |
| `blocked` | Explain unavailable capability | External action or operation outside Block 4.1 |

A confirmation proof contains:

```ts
export type ConfirmationProof = {
  id: string;
  fingerprint: string;
  mode: 'review' | 'explicit' | 'reinforced';
  confirmedAt: string;
  expiresAt: string;
};
```

Rules:

- fingerprint is generated from stable serialization of tool name, version, validated input, references and proposal ID;
- proof expires after 5 minutes;
- any input/reference/proposal change changes the fingerprint;
- a stronger proof may satisfy a weaker mode, never the reverse;
- proof is single-use for a successful mutation;
- failed validation does not consume proof;
- UI labels are not trusted as confirmation evidence.

## 3. Query tools

| Tool | Legacy source | Risk | Required entities | Input | Result | Confirmation | Undo |
|---|---|---:|---|---|---|---|---|
| `patient.search` | `search_patient` | `read` | none | `{ query: string }` | Up to 5 matching patient summaries | none | no |
| `patient.summarize` | `summarize_patient` | `read` | patient | `{ patient: EntityRef }` | Patient, latest record and active plan summary | none | no |
| `session.summarize_recent` | `summarize_sessions` | `read` | patient | `{ patient: EntityRef; limit?: number }` | Up to 3 recent sessions and aggregate pain/completion | none | no |
| `report.prepare_session_summary` | `create_report` | `read` | session or patient with unique target session | `{ session?: EntityRef; patient?: EntityRef }` | Reviewable session report summary; no persisted report | none | no |

### Query-specific constraints

- `patient.search` is the only tool allowed to intentionally return multiple patient matches.
- `patient.search` never establishes selected context automatically.
- `patient.summarize` must use one resolved patient.
- `session.summarize_recent.limit` defaults to `3`, minimum `1`, maximum `10`.
- `report.prepare_session_summary` asks for clarification when a patient has multiple eligible sessions and no session reference is supplied.
- Reads must not mutate `updatedAt`, events, notifications, conversations or drafts.

## 4. Draft application tools

The legacy `AtalAIDraft.intent` must map to one specific tool. There is no universal mutating `apply_draft` tool because one dynamic tool would hide risk and preconditions.

| Tool | Draft intent | Risk | Required entities | Real mutation | Confirmation | Undo |
|---|---|---:|---|---|---|---|
| `patient.create_with_record_and_plan` | `create_patient_plan` | `reversible-write` | none | Create patient, optional record, exercises and plan atomically | review | yes, complete transaction |
| `patient_record.update` | `update_patient_record` | `reversible-write` | patient | Update patient summary fields and record version | review | yes |
| `plan.create_for_patient` | `create_plan_for_existing_patient` | `reversible-write` | patient | Create plan and optional exercises; associate record | review | yes |
| `plan.update` | `update_existing_plan` | `reversible-write` | patient + plan | Update plan and optionally append/reuse exercises | review | yes |
| `exercise.create` | `create_exercise` | `reversible-write` | none | Create one or more exercises | review | yes |
| `exercise.update` | `update_existing_exercise` | `reversible-write` | exercise | Update exactly one exercise | review | yes |

### Draft mapping constraints

- Adapter validates `draft.intent` and rejects unsupported intent/tool combinations.
- `create_patient_plan` requires a non-empty patient name and non-empty plan title.
- A new active plan requires at least one valid exercise.
- A patient with an active plan cannot receive a second active plan through these tools.
- Existing exercise reuse requires a valid `sourceExerciseId` or unique exact normalized name/region match.
- `reusePreference: 'create-new'` intentionally creates a new exercise even when an exact match exists; the review summary must say so.
- `plan.update` verifies plan belongs to resolved patient.
- `patient_record.update` does not create a plan or exercises.
- `exercise.update` preserves exercise ID and creation timestamp.
- All composite creations must be undone as one transaction; partial undo is forbidden.

## 5. Direct write tools

| Tool | Legacy source | Risk | Required entities | Input | Confirmation | Undo |
|---|---|---:|---|---|---|---|
| `patient_note.add` | `add_patient_note` | `reversible-write` | patient | `{ patient: EntityRef; content: string }` | review | yes |
| `plan.activate` | `activate_plan` | `sensitive-write` | plan + patient relation | `{ plan: EntityRef }` | explicit | yes |
| `plan.pause` | `pause_plan` | `reversible-write` | plan | `{ plan: EntityRef }` | review | yes |
| `plan.complete` | `complete_plan` | `sensitive-write` | plan | `{ plan: EntityRef }` | explicit | yes |
| `plan.archive` | `archive_plan` | `sensitive-write` | plan | `{ plan: EntityRef }` | explicit | yes |
| `plan.restore` | `restore_plan` | `reversible-write` | plan | `{ plan: EntityRef }` | review | yes |
| `plan.replace_active` | `replace_active_plan` | `sensitive-write` | target plan + patient | `{ plan: EntityRef; replaceCurrent: true }` | explicit | yes, both plans |
| `settings.update` | `update_settings` | `reversible-write` | settings | `{ patch: AllowedSettingsPatch }` | review | yes |
| `data.export_local` | `export_data` | `sensitive-write` | none | `{ kind: 'patients'|'progress'|'plans'|'backup' }` | explicit | no; returns client effect |

### Direct-write constraints

#### `patient_note.add`

- content is trimmed;
- empty content is rejected;
- maximum 10,000 characters;
- undo removes only the created note when no later update changed it.

#### `plan.activate`

- fail when another plan is active unless invocation explicitly maps to `plan.replace_active`;
- active plan must include at least one existing exercise;
- plan must belong to an existing patient.

#### `plan.pause`

- allowed only from `active`;
- result summary names the plan.

#### `plan.complete`

- allowed from `active` or `paused`;
- confirmation copy states that patient delivery changes to completed status.

#### `plan.archive`

- allowed from `draft`, `paused` or `completed`;
- archiving an active plan is rejected; user must pause/complete first.

#### `plan.restore`

- allowed only from `archived`;
- restores to `draft`, not active.

#### `plan.replace_active`

- target plan belongs to the same patient as current active plan;
- target is not already active;
- current active plan is paused, never deleted;
- both plan snapshots are included in one undo receipt.

#### `settings.update`

Allow only:

```ts
type AllowedSettingsPatch = Partial<Pick<AppSettings,
  | 'notifications'
  | 'haptics'
  | 'compact'
  | 'sessionLock'
  | 'clinicalPrivacy'
  | 'aiSuggestions'
  | 'aiAlerts'
  | 'aiInstructions'
>>;
```

Reject `professionalName`, `specialty`, `clinic` and unknown keys in Block 4.1.

#### `data.export_local`

- confirmation copy warns that the file contains local clinical information;
- tool returns `{ type: 'download', filename, mimeType, content }`;
- registry executor must not click an anchor;
- UI adapter performs the local browser download only after success;
- no network request is allowed;
- audit outcome records `export prepared`, not external delivery.

## 6. Destructive and external registrations

Block 4.1 must not add new destructive behavior merely to demonstrate the policy. The registry may include non-executable capability metadata for future tools:

| Tool | Risk | Block 4.1 outcome |
|---|---:|---|
| `patient.delete_permanently` | `destructive` | blocked: unsupported product capability |
| `plan.delete_permanently` | `destructive` | blocked: use archive/manual guarded behavior |
| `message.send_patient` | `external` | blocked: external integrations are frozen |
| `email.send_report` | `external` | blocked: external integrations are frozen |
| `cloud.sync` | `external` | blocked: no backend in this phase |

These names are reserved only if implemented as explicit blocked definitions. They must not mutate or simulate success.

## 7. Entity resolution matrix

| Tool family | Explicit ID | Selected context | Exact label | Ambiguous label | Missing relation |
|---|---|---|---|---|---|
| query search | optional | not required | returns search results | allowed as results | n/a |
| query summarize | preferred | allowed | unique only | clarification | clarification |
| draft create new patient | no existing patient resolution | selected existing context rejected | duplicate detection only | clarification before create when duplicate candidates exist | n/a |
| update patient/record | preferred | allowed | unique only | clarification | fail |
| plan operations | preferred | allowed | unique within resolved patient | clarification | fail |
| exercise operations | preferred | allowed | unique exact name + region | clarification | fail |
| session/report | preferred | selected session when available | unique within patient | clarification | fail |

## 8. Duplicate protection

### Patient

Before `patient.create_with_record_and_plan`, compare normalized patient name against existing patients. When one exact match exists, return a clarification with choices:

- use existing patient;
- explicitly create a distinct patient.

The second choice must produce a new proposal fingerprint.

### Exercise

Exact normalized name and compatible region is a reuse candidate. Default behavior is reuse when `reusePreference === 'reuse-exact'`; otherwise create new intentionally and surface that in review.

### Plan

A plan is not deduplicated solely by title. The critical duplicate rule is one active plan per patient. Multiple draft plans are allowed.

## 9. Version conflict policy

For patient, record and plan writes, the adapter includes the base `updatedAt` values from the reviewed draft. Before transaction:

- mismatch returns `CORE_VERSION_CONFLICT`;
- no mutation or audit entry occurs;
- UI offers refresh/compare/keep-current-version behavior already present;
- a force/keep action creates a new proposal and confirmation fingerprint;
- force never bypasses relationship or invariant validation.

## 10. Registry completeness test

A test must assert that every current `AICommandType` and every mutating `AtalAIIntent` has exactly one adapter mapping to a registered tool or an intentional side-effect-free path. No legacy type may silently fall through to direct execution.
