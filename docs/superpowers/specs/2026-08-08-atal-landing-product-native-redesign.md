# Atal Landing — Product-Native Redesign Specification

**Status:** Approved visual direction; implementation authorized only on `/landing`.

**Date:** 2026-08-08

**Repository:** `jbskood-cyber/Atal-`

**Implementation branch:** `feature/atal-landing-premium-implementation`

## 1. Decision

The previous Blue Clinical landing direction is visually rejected. The redesign must look and feel like a public extension of the current Atal application rather than a generic SaaS page.

The approved concept is a product-native, light clinical composition built directly from Atal's real visual system and real workflows. It is a direction, not a pixel-perfect license to invent product UI, metrics, claims, testimonials, links or capabilities.

## 2. Canonical visual system

Use the product tokens already present in `app/globals.css`:

- `--green: #16a36a`
- `--green-dark: #0d7d51`
- `--mint: #e8f5ef`
- `--ink: #0f1416`
- `--muted: #6c7771`
- `--line: #e2e8e5`
- `--surface: #ffffff`
- `--canvas: #f7f9f8`

The landing must preserve the app's visual grammar: white surfaces, cool near-white canvas, green/mint accents, soft green-tinted shadows, compact interface density, restrained radii, crisp black-green typography and thin neutral borders.

Do not introduce a dark/navy global theme, purple-blue gradients, generic bento grids, nested cards, glassmorphism, fake dashboard statistics or unrelated illustration systems.

## 3. Core creative idea

**The product itself is the story.**

The visitor should move through one continuous clinical journey:

`Paciente → expediente → plan → ejercicios → sesión → reporte`

The landing will reveal real Atal surfaces as connected chapters rather than explain the product through generic icons or abstract diagrams. Atal IA appears as an operating layer inside that journey, not as a separate chatbot product.

## 4. Page architecture

### Header

- Real Atal logo and wordmark.
- Navigation: `Producto`, `Cómo funciona`, `Atal IA`, `Confianza`.
- Primary CTA: `Ver Atal en acción`.
- Secondary CTA: `Conocer Atal IA`.
- No login, pricing, contact or signup promises unless a real destination exists.

### Hero

- White/canvas composition with no eyebrow pill.
- Human opening about fragmented work.
- Product-led headline with one green emphasis, not gradient text.
- Short supporting copy.
- Two approved CTAs.
- One dominant product composition assembled from faithful Atal UI surfaces. No invented analytics dashboard.
- The first viewport must immediately look like Atal.

### Connected workflow

- Continuous editorial sequence, not six cards.
- Each chapter uses a faithful crop or reconstruction of a real Atal screen.
- Desktop may use a sticky product viewport with changing narrative.
- Mobile becomes a vertical sequence with readable native-scale surfaces.
- Copy remains concise and demonstrative.

### Atal IA graphite chapter

- The only dark/Graphite section.
- Ati appears here as a discrete official brand companion.
- Use the owner-provided Ati image; do not redraw, regenerate or replace the mascot.
- Show a real contextual request, a reviewable proposed action, confirmation and receipt/Undo where supported by the product.
- No raw JSON, fake clinical claims or speculative AI capabilities.

### Mobile clinical use

- Show genuine mobile app structures: bottom dock, compact lists, guided session, exercise or report surface.
- Avoid decorative phone collages that make the interface unreadable.
- The app UI itself remains the focal point.

### Trust and close

- Use verifiable product properties only.
- No testimonials, logos, customer counts, percentages or fabricated metrics.
- Final CTA repeats `Ver Atal en acción` and `Conocer Atal IA`.
- Footer remains minimal; no fake social, legal or contact links.

## 5. Ati contract

The owner-provided image at conversation upload `77240.png` is the official source reference.

Implementation requirements:

- derive a production asset from the supplied source without inventing a new mascot;
- preserve Ati's mint material, face, proportions and four-loop silhouette;
- use once beside Atal IA and at most one additional subtle appearance near the close;
- never replace the Atal logo;
- never use Ati as repetitive decoration;
- specify explicit width/height or aspect ratio to prevent CLS;
- provide meaningful or empty alt text according to whether the instance conveys content.

## 6. Product evidence rules

Every visible product screen must trace to an existing route, component or verified capability in the repository. Do not invent:

- patient counts;
- report counts;
- completion rates;
- authentication states;
- pricing;
- integrations;
- medical outcomes;
- clinical recommendations not grounded in an existing product interaction.

Use deterministic fixture content only when necessary to make a real screen legible, and label it internally in the evidence manifest.

## 7. Responsive and interaction requirements

Validate at 320×800, 360×800, 390×844, 768×1024, 1280×800 and 1440×900.

- no horizontal overflow;
- mobile menu operable by keyboard and touch;
- anchors land below the header;
- focus is visible;
- `prefers-reduced-motion` removes nonessential motion;
- product media has stable dimensions;
- no miniature desktop UI on mobile;
- all meaningful text meets WCAG 2.2 AA contrast;
- motion explains chapter transitions only.

## 8. Architecture and protections

- Keep implementation at `/landing`.
- Do not move `/` without explicit final owner approval.
- Keep public/private route boundary and lazy splitting.
- Public bundle must not import private store, Gemini runtime, Action Core or private repositories.
- Do not initialize or mutate `atal:store:v2` from `/landing`.
- Keep deep private routes intact.
- Do not modify FOCO, `main`, PR #20 or PR #22.
- No force push, auto-merge or deploy.
- PR #23 remains the historical approved spec draft; PR #24 remains the implementation PR and stays draft.

## 9. Acceptance criteria

The redesign is ready for owner review only when:

1. the first viewport is immediately recognizable as Atal;
2. all major product visuals are faithful to real app surfaces;
3. the page avoids generic SaaS composition and fabricated evidence;
4. Ati uses the supplied official source and respects the placement contract;
5. Quality, Behavior and E2E are green on the same HEAD;
6. route isolation and public bundle boundaries are verified;
7. complete screenshots for all required viewports have been manually inspected;
8. `/` is unchanged and PR #24 remains draft.
