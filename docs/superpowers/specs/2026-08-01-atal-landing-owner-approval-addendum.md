# Atal Premium Landing — Product Owner Approval Addendum

**Date:** 2026-08-01

**Applies to:** `docs/superpowers/specs/2026-07-28-atal-landing-premium-design.md`

**Status:** Approved with the binding adjustments below. This addendum supersedes conflicting wording in the original specification.

## Approved direction

- Use a product-led narrative around `Paciente → expediente → plan → ejercicios → sesión → reporte`.
- Build and validate the first implementation at `/landing`.
- Do not migrate the public landing to `/` until the product owner has reviewed and explicitly approved the final browser captures.
- Keep the page clinically calm and predominantly Blue Clinical on a cold near-white background.
- Use one Graphite Clinical section for Atal IA.
- Use restrained motion only to explain workflow progression or state change. No decorative continuous motion, bounce easing, purple-blue gradients, multicolor AI glow, generic SaaS card grids or nested cards.
- Include a brief human introduction showing the cost of fragmented work across notes, messages and documents. Do not publish invented testimonials, customer logos, ratings, metrics, savings, recovery outcomes or scarcity.
- Primary CTA: `Ver Atal en acción`.
- Secondary CTA: `Conocer Atal IA`.
- Do not expose registration, pricing, contact or private-app entry CTAs until those destinations exist safely.

## Ati decision

Ati is now the approved official mascot. The original no-mascot wording is superseded as follows:

- Ati appears as a small badge next to `Atal IA` in the Graphite agent section.
- Ati may appear in at most one additional supporting position, preferably the final transition or CTA.
- Ati never replaces the Atal logo and is not repeated across every section.
- Ati must not wear a medical costume, make a diagnostic gesture or imply clinical authority.
- Motion must be subtle and optional under `prefers-reduced-motion`.
- If the official production asset is not present in persistent project sources, implement a layout-stable `AtiSlot` contract with no substitute character and record the missing asset as a blocker for final visual acceptance.

## Routing and isolation decision

The first implementation remains at `/landing`. The current private root `/` and every deep private route remain unchanged.

The public entry must not initialize or import:

- `bootstrapRealWorkspace`;
- `atal:store:v2` repositories or hooks;
- Action Core;
- Gemini or Atal IA execution modules;
- patient, plan, exercise, session or draft state;
- `AtalPersistentShell` or private preference hydration.

Route isolation must be proved by deterministic tests and production bundle inspection, not inferred from source layout.

## Governance

Approval authorizes:

1. a task-level implementation plan;
2. a separate implementation branch and draft PR;
3. TDD implementation and browser QA at `/landing`.

Approval does not authorize:

- changes to `main`, PR #20 or PR #22;
- moving the landing to `/`;
- merge, auto-merge or deploy;
- authentication, pricing, billing or analytics activation;
- publishing incomplete legal or contact links;
- marking the implementation PR ready for review before product-owner visual approval.
