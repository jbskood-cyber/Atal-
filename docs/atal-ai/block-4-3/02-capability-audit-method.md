# Block 4.3 — Capability audit method

## Evidence hierarchy

A capability exists only when all of the following are identifiable:

1. a user-visible manual operation;
2. a canonical code entry point;
3. persisted state or a deliberate client effect;
4. at least one current automated test or an explicit evidence gap;
5. an exact AI read/action path or an explicit missing/excluded classification.

A similarly named intent, prompt phrase or visual control is not evidence of functional AI parity.

## Coverage classes

- `covered`: Atal IA can complete the same canonical outcome with the required validation, persistence and safety behavior.
- `partial`: an existing AI path omits part of the manual outcome, context, persistence, audit, undo, client effect or multimodal behavior.
- `missing`: no matching AI read or action path exists.
- `excluded`: the operation is intentionally unavailable in Block 4.3 for a product, safety or external-integration reason.

Only `covered` rows count toward the full-parity percentage.

## Canonical-path rule

The model never mutates data directly. A capability can be marked covered only when its AI path reaches Atal's canonical store, repository, transaction or approved client-effect implementation.

Duplicating manual mutation logic inside the assistant does not count as parity.

## Risk and confirmation

Risk is assigned by application policy, never by Gemini.

- Read operations require no confirmation.
- Explicit, unambiguous and reversible low-risk requests use the original instruction as authorization.
- File-derived clinical facts require a compact review before persistence.
- Sensitive writes require a short confirmation.
- Destructive actions require reinforced confirmation or remain excluded.
- External actions require deliberate user initiation and may remain excluded.

## Audit and undo

The matrix distinguishes between:

- application activity events;
- deterministic transaction audit events;
- client-effect-only operations;
- operations with no current audit trail.

Undo is counted as validated only when the Block 4.1 transaction machinery returns a checked receipt. Manual compensation and unsupported undo remain explicit gaps.

## Multimodal relevance

`text`, `audio`, `image` and `pdf` indicate the input forms that can reasonably initiate the capability. They do not imply that multimodal persistence or extraction is already complete.

Recorded audio is the approved voice path for Block 4.3. Gemini Live is excluded because its current cost is not viable for the product.

## Verification standard

Before publication, every row must pass all of these checks:

- unique stable capability id;
- one of the nine approved product domains;
- current route and source symbol;
- declared canonical persistence or client effect;
- existing evidence file;
- exact registered AI tool names where coverage is claimed;
- explicit gap for every `partial`, `missing` or `excluded` row;
- explicit `keep`, `build` or `exclude` disposition.

The generated Markdown matrix is derived from the typed catalog and must regenerate without a diff.
