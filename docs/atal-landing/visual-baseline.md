# Atal Landing — Visual QA Baseline

## Candidate

- Route: `/landing`
- Implementation branch: `feature/atal-landing-premium-implementation`
- Protected private route: `/`
- Product direction: Blue Clinical public surface with one Graphite Atal IA section
- Status: draft candidate; not approved for root migration, merge or deployment

## Required viewport matrix

| Viewport | Purpose | Acceptance checks |
| --- | --- | --- |
| 320 × 800 | narrow overflow boundary | no horizontal overflow; CTA and navigation remain operable; no clipped headings |
| 360 × 800 | compact Android mobile | first viewport hierarchy, touch targets, workflow continuation and footer fit |
| 390 × 844 | primary mobile review | mobile menu, focus transfer, Escape close, CTA anchors and section rhythm |
| 768 × 1024 | tablet portrait | layout transition, readable line lengths and evidence composition |
| 1280 × 800 | compact desktop | complete first viewport with visible product signal and next-section continuity |
| 1440 × 900 | wide desktop | spacing discipline, max-width behavior and Graphite section balance |

## Locked visual system

### Palette

- Background: true or cold white; never cream, beige or warm ivory.
- Primary action: Blue Clinical.
- Atal IA section: Graphite Clinical.
- Text: high-contrast cool near-black.
- Borders and muted text: cool neutral gray.
- Prohibited: purple-blue gradients, decorative glow, warm SaaS neutrals and status colors used as decoration.

### Composition

- One clear hero focal point: headline, short body, two approved CTA links and one synthetic product scene.
- No eyebrow, kicker, floating badge or fake metric above the hero heading.
- Section order remains: hero → fragmentation → workflow → Atal IA → mobile evidence → trust → final CTA.
- Open editorial spacing is preferred over nested cards or bento grids.
- Motion is limited to hierarchy/reveal support and must collapse under `prefers-reduced-motion`.

### Copy lock

Approved first-viewport copy:

- `Del expediente al seguimiento, sin perder el hilo del paciente.`
- `Atal conecta pacientes, planes, ejercicios, sesiones y reportes en una experiencia móvil. Atal IA te ayuda a consultar y aplicar cambios que siempre puedes revisar.`
- `Ver Atal en acción`
- `Conocer Atal IA`

No additional hero pill, metric, testimonial, pricing or registration copy is allowed.

## Interaction baseline

The candidate must preserve all of the following:

- skip link reaches `#contenido`;
- primary CTA reaches `#flujo`;
- secondary CTA reaches `#atal-ia`;
- mobile menu opens from keyboard input;
- focus moves to the first revealed menu item only after it becomes visible;
- Escape closes the menu and returns focus to the trigger;
- reduced-motion mode preserves all content and removes long transitions;
- the public route leaves `atal:store:v2` uninitialized;
- private deep routes remain owned by `PrivateAppEntry`.

## Fidelity ledger

| Comparison point | Required result | Current source evidence | Final visual evidence required |
| --- | --- | --- | --- |
| Hero hierarchy | one H1, short body, two CTA links, one product signal | `src/landing/LandingPage.tsx` | screenshot at 390 × 844 and 1280 × 800 |
| Palette | cold white + Blue Clinical; Graphite only for Atal IA | `src/landing/landing.css`, `src/landing/evidence.css` | screenshot color inspection across hero and agent section |
| Container model | open sections; no generic nested-card grid | landing components and scoped CSS | full-page screenshots at mobile and desktop |
| Navigation | compact desktop nav and accessible mobile sheet | `src/landing/components/LandingNav.tsx` | keyboard recording or Playwright trace at 390 × 844 |
| Workflow story | exactly six ordered steps | `src/landing/content.ts` | desktop and tablet capture with all steps legible |
| Ati treatment | hidden until official approved asset exists | `src/landing/components/AtiSlot.tsx` | owner-approved asset capture after integration |
| Public/private isolation | no private bootstrap or store initialization | routing source tests and Playwright | clean-storage browser run at `/landing` |
| Responsive safety | no overflow at all six required widths | `e2e/landing-premium.spec.mjs` | CI result plus native-size screenshots |

## Remaining hard gates before owner review

1. Capture native-size screenshots for every required viewport from the exact PR HEAD.
2. Inspect hero, workflow, Graphite section, mobile evidence, trust section and footer visually.
3. Record any mismatch and the exact corrective commit in this file.
4. Verify the current official Ati asset is either integrated under the contract or explicitly absent with no layout gap.
5. Confirm quality, Behavior and E2E are green on the same HEAD.
6. Present the `/landing` candidate to the product owner without moving `/`.

## Approval boundary

A visual QA pass does not authorize merge, deployment, marking the PR ready or replacing `/`. Those actions require explicit product-owner visual approval after reviewing the candidate.