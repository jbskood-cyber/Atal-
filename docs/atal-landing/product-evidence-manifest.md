# Atal Landing — Product Evidence Manifest

## Purpose

This manifest records every product claim and synthetic scene currently rendered at `/landing`. It prevents the public surface from implying unsupported capabilities, exposing real clinical data, or drifting away from the protected Atal application.

## Evidence policy

- All names, plans, doses and session values shown on the landing are synthetic.
- The landing does not read `atal:store:v2`, IndexedDB, patient repositories, Action Core or Gemini runtime state.
- Product claims must map to behavior already implemented and protected by the private application.
- Synthetic UI may demonstrate a capability, but it must not look like a live authenticated session.
- No testimonial, adoption metric, pricing promise, lead form or clinical-outcome claim is permitted without a separate approved source.

## Current visible evidence

| Surface | Visible evidence | Capability represented | Source in landing | Safety / provenance |
| --- | --- | --- | --- | --- |
| Hero product scene | `Paciente · Francisco`, active plan, four-week duration and three sessions per week | Patient context and connected treatment plan | `src/landing/LandingPage.tsx` | Fully synthetic; no private data access |
| Fragmentation transition | Notes, messages, documents and follow-up converging into Atal | Consolidated clinical workflow narrative | `src/landing/LandingPage.tsx` | Conceptual illustration; no external integrations claimed |
| Workflow narrative | Patient → record → plan → exercises → session → report | Existing Atal domain flow | `src/landing/content.ts` | Copy-only representation of protected product domains |
| Atal IA example | Natural-language exercise dose change, review action and Undo result | Reviewable agent action through shared product operations | `src/landing/LandingPage.tsx` | Synthetic conversation; does not invoke Gemini or mutate state |
| Mobile evidence | Compact patient and session/report compositions | Mobile-first private product experience | `src/landing/components/MobileProductEvidence.tsx` | Synthetic values; no authenticated route or repository access |
| Trust ledger | Reviewability, shared operations and professional judgment boundary | Action Core, audit/Undo and clinical-safety positioning | `src/landing/components/TrustLedger.tsx` | Claims limited to implemented product boundaries |

## Claim boundaries

The following wording is approved because it describes implemented operating behavior without guaranteeing clinical outcomes:

- Atal connects patients, plans, exercises, sessions and reports.
- Atal IA can consult context and prepare reviewable actions.
- Changes remain reviewable and may expose Undo where the protected product supports it.
- Atal supports clinical organization and does not replace professional judgment.

The following claims are prohibited on the current landing:

- diagnostic accuracy, treatment efficacy or patient outcome improvements;
- percentages, customer counts, time savings or financial ROI;
- automatic autonomous clinical decisions;
- public signup, free trial, pricing or contact flows that do not exist;
- claims that Ati performs diagnosis or replaces Atal branding.

## Ati asset contract

`AtiSlot` is intentionally hidden when no approved persistent asset URL is supplied. The official asset must meet all of these conditions before integration:

1. approved by the product owner;
2. committed or referenced from a durable project-controlled source;
3. transparent or background-matched for the Blue Clinical and Graphite surfaces;
4. explicit intrinsic dimensions to prevent layout shift;
5. used beside `Atal IA` and at no more than one additional subtle location;
6. not used as the Atal logo or as a clinical authority figure.

No placeholder, newly invented mascot or third-party character may fill this slot.

## Route and privacy verification

The source-level and browser tests must continue to prove:

- `/landing` does not initialize `bootstrapRealWorkspace`;
- `atal:store:v2` remains absent after a clean public-route visit;
- private state hooks, repositories and AI runtime are not imported into the public entry;
- `/` and existing private deep routes continue through `PrivateAppEntry`;
- the CTA links only navigate to approved in-page anchors.

## Review trigger

Update this manifest whenever visible copy, a synthetic scene, product evidence, Ati usage or a public CTA changes. A change that adds a new capability claim requires evidence from the protected application before it can be accepted.