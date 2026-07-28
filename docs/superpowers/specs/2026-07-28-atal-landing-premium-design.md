# Atal Premium Landing — Product and UX Design Specification

**Status:** Ready for product-owner review. No implementation is authorized by this document.

**Date:** 2026-07-28

**Repository:** `jbskood-cyber/Atal-`

**Design branch:** `feature/atal-landing-premium-design`

**Stacked base:** `feature/atal-final-polish-agent-qa` at `b142d31d124acaa6e9da7ed5357a74b2bf38fa9e`

**Protected product checkpoint:** `2cfdc05f5f0178c8a4e5851f1be6770b2a9c4798`

---

## 1. Purpose

Create a premium, credible, mobile-first marketing landing for Atal that communicates the complete physiotherapy workflow and the value of Atal IA as an operational agent.

The landing must feel like the public expression of the same product already implemented: clinically calm, compact, trustworthy, fast and action-oriented. It must not resemble a generic AI SaaS template, an appointment-management product, a hospital ERP or a speculative medical-AI product.

The landing is a separate public surface. It must coexist with the existing Vite + React 19 + React Router application without importing, initializing or mutating `atal:store:v2`, Action Core, Gemini runtime, patient data, drafts, sessions or private application state.

---

## 2. Persistent-state findings

The current application is built with Vite, React 19, React Router 7, TypeScript, Tailwind 4 utilities, Motion and Poppins. The private application currently owns `/`, patient, plan, exercise, activity, settings and assistant routes inside a persistent clinical shell.

PR #20 remains the certified Behavior System base at `6a1258b91353ed843d2d0501ba3c2519a393f7bc`. PR #22 remains open, draft and unmerged. Its product/QA checkpoint is deterministic green, while clean final real-Gemini recertification remains blocked by provider saturation rather than a reproducible product failure.

Therefore the landing must:

- remain isolated from the Behavior System and Action Core;
- avoid using the private app root route as its permanent public URL without an explicit routing migration;
- be developed in a separate branch and PR;
- avoid creating another architectural stack;
- use current product tokens and components selectively, not import the private app shell;
- preserve the existing stacked PR order.

---

## 3. Design-method synthesis

### Superpowers principles applied

- Separate the landing into bounded units with explicit responsibilities.
- Design and approve the user journey before implementation.
- Avoid unrelated refactors.
- Define observable acceptance criteria before code.
- Keep product state and marketing state independent.

### Impeccable principles applied

The public `pbakaus/impeccable` repository identifies common AI-generated design failures: default SaaS templates, ubiquitous Inter, purple-to-blue gradients, nested cards, gray text on colored surfaces and repetitive rounded icon tiles. It also recommends a workflow built around `shape`, `critique`, `audit`, `polish`, `distill`, `clarify`, `adapt`, `optimize` and live browser iteration.

For Atal this means:

- no gradient-led hero;
- no card grid as the primary storytelling device;
- no abstract AI particles or glowing orbs;
- no stock doctor imagery;
- no exaggerated clinical claims;
- typography, spacing and product evidence must carry the page;
- use animation only to explain workflow or state transitions;
- run deterministic accessibility, responsive and performance checks in addition to visual critique.

Impeccable is used as a design-review system, not copied as a page template and not introduced as a runtime dependency without a separate implementation decision.

---

## 4. Audience and decision

### Primary audience

Independent physiotherapists and small physiotherapy clinics that currently coordinate patients, records, plans, exercises, follow-up messages and reports across paper, messaging apps, documents and disconnected software.

### Secondary audience

Clinic owners or lead therapists evaluating whether Atal can standardize the work of a small team without turning the clinic into an administrative ERP.

### Core job to be done

> Help me understand, in less than two minutes, whether Atal can reduce operational friction across the full patient-treatment loop while keeping the physiotherapist in control.

### Required visitor beliefs

By the main CTA, the visitor should understand:

1. Atal is built specifically for physiotherapy operations.
2. It connects the complete workflow rather than adding one more isolated tool.
3. Atal IA can read context and prepare or execute reviewable actions through the same product system.
4. Changes remain visible, confirmable, reversible and grounded in the clinical record.
5. The product is usable on a phone during real work.

---

## 5. Approaches considered

### Approach A — Conventional SaaS conversion page

Hero, logo strip, feature cards, testimonial cards, pricing and footer.

**Advantages:** Familiar, fast to implement, easy to scan.

**Disadvantages:** Makes Atal look interchangeable with generic AI products; encourages unverified social proof; feature cards fragment the central workflow; weak product differentiation.

**Decision:** Rejected.

### Approach B — Product-led workflow narrative

A concise public page organized around the real physiotherapy loop. Product UI evidence appears at the moment each workflow step is explained. Atal IA is shown as a horizontal operating layer rather than a separate chatbot feature.

**Advantages:** Directly communicates product coherence; reuses real product evidence; supports mobile storytelling; reduces unsupported marketing claims.

**Disadvantages:** Requires disciplined screenshots or faithful product scenes; demands stronger narrative and responsive choreography.

**Decision:** Recommended.

### Approach C — Editorial clinical manifesto

Large typography, strong brand story, few screenshots and an emotional position against fragmented clinical software.

**Advantages:** Distinctive and premium; strong brand voice.

**Disadvantages:** Can become vague; insufficient proof for a new product; harder to explain operational depth.

**Decision:** Use selectively as tone, not as the page architecture.

### Recommended synthesis

Use **Approach B** as the structure with the restraint and confidence of **Approach C**. The result should feel like a concise product demonstration framed by a clear clinical point of view.

---

## 6. Information architecture and routes

### Recommended route architecture

- `/` — public landing.
- `/app` — private application entry and current home screen.
- `/app/patients`, `/app/plans`, `/app/exercises`, `/app/activity`, `/app/settings` — future normalized private routes.
- `/assistant` may remain temporarily for compatibility, but a later migration should consider `/app/assistant`.
- `/privacy` — public privacy summary.
- `/terms` — public terms placeholder only when legally prepared; do not publish empty legal copy.

### Migration strategy

The current application uses `/` as its private home. Implementation must not silently replace it. The recommended sequence is:

1. Add a route boundary that distinguishes `PublicRoutes` and `PrivateAppRoutes`.
2. Move the current private home to `/app` while preserving redirects for existing development links.
3. Keep deep private routes functioning during the transition.
4. Add routing E2E tests before changing the root.

Alternative for an earlier preview: expose the landing at `/landing` until product-owner approval, then migrate `/` in a dedicated routing commit.

### Isolation rule

The landing route must not render `AtalPersistentShell`, `ThemeProvider` if it initializes private preferences, `useAtalStore`, AI hooks or private repositories. Public components may consume shared static design tokens but no clinical state.

---

## 7. Narrative architecture

### Narrative spine

**“Toda la operación clínica, conectada alrededor del paciente.”**

Atal is not presented as “AI for physiotherapists” first. It is presented as the connected clinical workflow. Atal IA then appears as the operational layer that understands and acts across that workflow under explicit control.

### Message hierarchy

1. **Category:** Clinical operating system for physiotherapists.
2. **Outcome:** Less fragmented work, clearer follow-up and faster execution.
3. **Mechanism:** One connected patient-to-report flow.
4. **Differentiator:** Atal IA works through the same reviewable Action Core as the normal UI.
5. **Trust:** Visible changes, confirmation, Undo, canonical records and no hidden parallel state.

### Voice

- Direct, calm and clinically literate.
- Demonstrative rather than explanatory.
- No “revolutionary”, “diagnoses automatically”, “guarantees recovery”, “replaces staff” or unsupported efficiency percentages.
- Prefer verbs: register, organize, create, guide, review, update.
- Use “Atal te ayuda a…” rather than “Atal decide…”.

---

## 8. Page sections

### 8.1 Compact navigation

**Contents:** Atal wordmark, Producto, Cómo funciona, Atal IA, CTA.

**Behavior:** Transparent over the hero, becomes a quiet opaque surface after scroll. Mobile uses a simple sheet; no complex mega-menu.

**Primary CTA:** `Ver Atal en acción`.

**Secondary action:** `Entrar a Atal` only when authentication or a public demo route exists. Do not link visitors directly into seeded private data.

### 8.2 Hero — product promise and immediate proof

**Eyebrow:** `Operación clínica para fisioterapia`.

**Working headline:**

> Del expediente al seguimiento, sin perder el hilo del paciente.

**Supporting copy:**

> Atal conecta pacientes, planes, ejercicios, sesiones y reportes en una experiencia móvil. Atal IA te ayuda a consultar y aplicar cambios que siempre puedes revisar.

**CTA:** `Ver el flujo completo`.

**Secondary CTA:** `Conocer Atal IA`.

**Visual:** One real product composition, not a device-mockup collage. Recommended scene: patient profile with active plan and a compact Atal IA exchange showing a reviewable change. On mobile, show one crop with a controlled vertical reveal rather than a miniature desktop screenshot.

**Trust line:** `Diseñado para el trabajo diario del fisioterapeuta.`

No customer logos or invented metrics.

### 8.3 Workflow strip — one patient, one connected loop

A continuous horizontal/vertical narrative:

`Paciente → Expediente → Plan → Ejercicios → Sesión → Reporte`

Each step includes one concise result and one product detail. This is not six separate feature cards. Use a connected rail, numbered chapters or a sticky product viewport with changing annotations.

Suggested copy:

- **Paciente:** Toda la información relevante empieza en un mismo lugar.
- **Expediente:** El contexto clínico queda versionado y disponible.
- **Plan:** Objetivos, frecuencia, duración y ejercicios permanecen conectados.
- **Ejercicios:** Una biblioteca reutilizable evita reconstruir cada indicación.
- **Sesión:** El paciente registra dolor, energía, esfuerzo y observaciones.
- **Reporte:** El fisioterapeuta revisa, consulta y ajusta el siguiente paso.

### 8.4 Atal IA — agent, not chatbot

**Headline:**

> Pídeselo como lo dirías en la clínica.

Show three short interactions grounded in real capabilities:

1. `Crea un plan de cuatro semanas para Francisco, tres veces por semana.`
2. `Cambia ese ejercicio a 4 series de 10 y no modifiques el resto del plan.`
3. `Revisa la última sesión completada y añade una observación.`

For mutations, show the compact `Aplicar cambios` state and the small `Cambios aplicados` receipt with Undo. Never show raw tool JSON, completion percentages or a visible draft tab.

Trust copy:

> Atal IA consulta el contexto, prepara acciones y utiliza las mismas operaciones que la interfaz. Los cambios sensibles se confirman y el historial queda disponible para revisión.

### 8.5 Mobile-in-the-clinic section

Demonstrate thumb reach, compact density, guided session, keyboard safety and rapid navigation. Use real mobile captures or faithful browser-rendered scenes.

Working headline:

> Hecho para usarlo entre pacientes, no solo frente a un escritorio.

Avoid decorative phone frames that reduce legibility. The content itself should prove mobile quality.

### 8.6 Evidence and trust section

Use verifiable product properties instead of testimonials until real users exist:

- Shared actions between normal UI and Atal IA.
- Reviewable changes and Undo.
- Persistent patient, plan and session state.
- Isolated contextual assistants.
- Mobile-first interaction.
- Data remains under the physiotherapist’s review.

This section may use a compact evidence ledger, not a grid of oversized cards.

### 8.7 Ati integration slot

Until the product owner supplies the official mascot, the page must remain complete without a substitute character.

Reserved roles for Ati after approval:

- small guide near the workflow transition or final CTA;
- optional empty-state illustration for public demo states;
- subtle reaction to a completed workflow, respecting reduced-motion;
- no replacement for the product logo;
- no use in every section;
- no medical costume, diagnostic gesture or claim of authority unless explicitly approved.

The initial implementation exposes an `AtiSlot` component with `hidden` as the default state and no layout collapse or placeholder silhouette visible to visitors.

### 8.8 Final CTA

**Headline:**

> Menos sistemas separados. Más continuidad clínica.

**Primary CTA:** `Ver Atal en acción`.

**Secondary:** `Hablar sobre una prueba` only when there is a real contact path.

Below it, a concise statement that Atal supports operational organization and does not replace professional clinical judgment.

### 8.9 Footer

Atal, Producto, Privacidad, Contacto and `Entrar a Atal` when available. No empty social links, fake addresses or legal links without content.

---

## 9. Visual direction

### Existing-product continuity

Use the current Blue Clinical and Graphite Clinical vocabulary. The public surface may have more breathing room, but it must share recognizable type, color, border and radius logic with the application.

### Color

- Background: cold near-white, not cream or beige.
- Primary: clinical blue already used by the app.
- Text: tinted near-black/graphite.
- Surfaces: white and cool-gray divisions.
- Green is reserved for clear successful state evidence, never as a decorative response background.
- No purple gradients, gold, red-led hero or multicolor AI glow.

### Typography

Continue with the existing product font during the first implementation to avoid a split brand. A later brand-typography decision may introduce a display face only if performance, Spanish glyph support and product continuity are validated.

Typography should feel editorial through scale, measure and whitespace rather than novelty.

### Layout

- Hero maximum text measure: approximately 12–15 words per line on desktop and 7–10 on mobile.
- Use wide editorial sections and connected sequences.
- Avoid nested cards.
- Product screenshots sit on quiet surfaces with meaningful annotations.
- Maintain a disciplined spacing scale shared with the app where possible.

### Motion

- Workflow progress or product viewport transitions may animate.
- Use opacity/translation with restrained durations.
- No elastic or bounce easing.
- No continuous decorative motion.
- `prefers-reduced-motion` must remove nonessential transitions and preserve all content.

---

## 10. Responsive behavior

### 320–479 px

- Single-column hero.
- CTA buttons full-width only when necessary; avoid excessive button height.
- Workflow becomes vertical and keeps step labels visible.
- Product crops prioritize legible actions, not full-screen miniature screenshots.
- Sticky elements disabled when they compete with mobile viewport height.
- Navigation sheet provides large targets and safe-area padding.

### 480–767 px

- Hero may use a slightly wider product crop below copy.
- Workflow remains vertical or uses two-column chapter rows.
- Evidence items can form a two-column grid only when text remains readable.

### 768–1199 px

- Hero transitions to split layout.
- Workflow may use a sticky product viewport with scrolling narrative.
- Product evidence keeps a minimum legible UI scale.

### 1200 px and above

- Limit maximum content width; do not stretch screenshots indefinitely.
- Use whitespace to create premium rhythm.
- Preserve reading order and avoid decorative empty expanses.

---

## 11. CTA and conversion model

The first version should optimize for product understanding, not aggressive lead capture.

### Approved CTA hierarchy

1. `Ver Atal en acción` — scrolls to workflow/product demo or opens a controlled demo.
2. `Conocer Atal IA` — anchors to the agent section.
3. `Entrar a Atal` — private access only when safe authentication exists.
4. `Hablar sobre una prueba` — optional later contact flow.

### Prohibited patterns

- Countdown timers.
- Fake waitlists or scarcity.
- “Start free” when no real self-service flow exists.
- Email collection without a stated purpose and privacy notice.
- Prominent pricing before product packaging is defined.

---

## 12. Accessibility

Implementation acceptance requires:

- WCAG 2.2 AA contrast for text, controls and focus states.
- Semantic landmark structure and a single page `h1`.
- Skip link to main content.
- Keyboard-operable navigation and mobile menu.
- Minimum practical touch targets of 44 × 44 CSS px.
- Descriptive alternative text for product scenes; decorative frames use empty alt.
- No essential meaning conveyed only through color.
- Workflow sequence has a readable text representation independent of animation.
- Reduced-motion behavior.
- Zoom to 200% without loss of actions or horizontal page scrolling at common widths.
- Spanish language metadata and correct pronunciation of “Atal IA”.

---

## 13. Performance and delivery

### Budgets for the landing route

- Initial JavaScript target: under 170 KB compressed for public route-specific code, excluding explicitly justified shared runtime.
- Largest Contentful Paint target: under 2.5 seconds on a representative mid-tier mobile profile.
- Cumulative Layout Shift: under 0.1.
- Interaction to Next Paint: under 200 ms for local navigation and menu interactions.
- Hero visual: responsive AVIF/WebP with explicit dimensions and fallback.
- Below-fold product scenes: lazy loaded.
- No landing dependency on Gemini, IndexedDB or private store hydration.

### Route-level splitting

Public landing and private app must be lazy boundaries. Loading `/` must not eagerly import guided sessions, AI execution engine, patient repositories or the private shell.

### Asset policy

Use optimized exports generated from real product UI. Avoid remote stock URLs and third-party image dependencies. Keep source captures or scene-generation instructions documented for reproducibility.

---

## 14. SEO and structured metadata

### Page title proposal

`Atal — Operación clínica para fisioterapeutas`

### Meta description proposal

`Organiza pacientes, expedientes, planes, ejercicios, sesiones y reportes en un flujo móvil conectado, con Atal IA para consultar y aplicar cambios revisables.`

### Technical requirements

- Canonical URL configured per deployment environment.
- Open Graph image based on real product composition.
- `lang="es"`.
- Descriptive page headings and internal anchor labels.
- Robots behavior explicit for preview vs production.
- Sitemap includes only real public routes.
- `SoftwareApplication` structured data only with truthful application category, platform and offer information. Omit ratings, reviews and price until verified.
- No medical-condition or treatment-result structured claims.

Vite client rendering can ship the first version, but production SEO acceptance should verify that title, description and meaningful content are available to crawlers. If deployment evidence shows inadequate rendering, evaluate static pre-rendering for public routes without migrating the private app to a new framework.

---

## 15. Privacy-safe analytics

Analytics are optional and must be disabled until a real provider and privacy notice are selected.

When enabled, track only public interaction events such as:

- `landing_view`
- `workflow_section_view`
- `atal_ai_section_view`
- `primary_cta_click`
- `private_app_entry_click`

Do not send:

- patient data;
- local-storage values;
- conversation text;
- exercise or plan names from private state;
- identifiers from `atal:store:v2`;
- full query strings when they may carry private information.

Prefer aggregate, cookieless or consent-compatible measurement. The analytics adapter must be a no-op by default and remain outside private clinical repositories.

---

## 16. Components and boundaries

Proposed public-only modules:

- `src/landing/LandingPage.tsx`
- `src/landing/components/LandingNav.tsx`
- `src/landing/components/HeroProductScene.tsx`
- `src/landing/components/WorkflowNarrative.tsx`
- `src/landing/components/AgentEvidence.tsx`
- `src/landing/components/MobileProductEvidence.tsx`
- `src/landing/components/TrustLedger.tsx`
- `src/landing/components/AtiSlot.tsx`
- `src/landing/components/LandingFooter.tsx`
- `src/landing/landing.css` or a scoped Tailwind entry consistent with current build
- `src/landing/analytics.ts` with no-op default

Rules:

- Public modules may not import `atalStore`, Action Core, AI repositories or patient/session types.
- Product scenes receive static view models or local fixture data clearly marked as demonstration content.
- No copied patient names from live or local user data.
- The route boundary owns lazy imports.
- Shared logo, basic button tokens and typography may be extracted only when doing so does not change private app behavior.

---

## 17. Product evidence strategy

### Preferred evidence order

1. Browser-rendered screenshots from the actual current candidate.
2. Purpose-built static product scenes using the same components but static synthetic props.
3. Annotated captures.
4. Abstract diagrams only for workflow relationships.

### Screenshot rules

- Synthetic patient information only.
- No browser chrome unless it explains responsive behavior.
- Capture at consistent viewports.
- Maintain visible text legibility.
- Never edit a screenshot in a way that depicts a capability not present in the product.
- Document branch SHA for every final capture set.

---

## 18. QA plan

### 18.1 Design review gates

Before implementation:

1. Product owner approves this specification.
2. Superpowers writing-plans produces an implementation plan.
3. A visual direction board or three hero/workflow compositions are reviewed.

During implementation:

1. **Build Web Apps / frontend-app-builder** for the initial public surface, following the approved spec rather than generating a generic template.
2. **React best practices** review for route splitting, component boundaries and rendering performance.
3. **Impeccable shape/critique** after the first complete page.
4. **Impeccable audit** for accessibility, responsive behavior and performance.
5. **Impeccable distill/clarify** to remove excess sections and vague copy.
6. **Impeccable polish** only after interaction and performance gates are green.

### 18.2 Browser and Playwright matrix

Required viewports:

- 360 × 800 Android compact.
- 390 × 844 common mobile.
- 768 × 1024 tablet portrait.
- 1280 × 800 laptop.
- 1440 × 900 desktop.

Required tests:

- Public root renders without private shell or private store initialization.
- All navigation anchors and CTA targets work.
- Mobile menu is keyboard accessible and returns focus correctly.
- No horizontal overflow at 320 px.
- Product evidence remains legible at mobile widths.
- Reduced-motion path contains the complete story.
- Images reserve dimensions and do not create layout shift.
- Deep private routes continue working.
- Redirects preserve existing development access.
- Public route does not read or write `atal:store:v2`.
- Public bundle does not include AI execution modules in its initial chunk.
- Lighthouse or equivalent budgets are recorded, not inferred from source inspection.

### 18.3 Visual regression

Capture stable screenshots for each required viewport after:

- hero;
- workflow midpoint;
- Atal IA section;
- final CTA/footer;
- mobile menu open;
- reduced-motion mode.

Compare against the approved visual baseline. Do not update baselines to hide regressions.

### 18.4 Content QA

- Every capability claim maps to an implemented and verified product behavior.
- No invented testimonials, logos, ratings, savings or recovery outcomes.
- Consistent terms: paciente, expediente, plan, ejercicio, sesión, reporte, Atal IA.
- CTA labels match actual destinations.
- Privacy and professional-judgment statements are visible where needed.

---

## 19. Acceptance criteria

The landing is ready for final product-owner review only when:

1. It tells the patient-to-report workflow in under two minutes.
2. Atal IA is represented as a reviewable operational agent, not a generic chatbot.
3. Mobile and desktop designs pass real browser inspection.
4. No private store, AI runtime or patient data initializes on the public route.
5. Deep app routes and current Behavior System tests remain green.
6. Accessibility and performance budgets have measured evidence.
7. All product claims are traceable to current functionality.
8. The page remains visually complete without Ati.
9. Ati can be integrated later through the defined slot without redesigning the page.
10. Impeccable critique, audit and polish findings are resolved or explicitly accepted.
11. The product owner has approved the final captures before the landing PR becomes ready for review.

---

## 20. Out of scope for this phase

- Implementing the landing.
- Installing Impeccable into the repository.
- Authentication or account creation.
- Pricing and billing.
- Publishing testimonials or clinic logos.
- Creating or substituting the Ati mascot.
- Modifying Action Core, Atal IA behavior or `atal:store:v2`.
- Merging PR #20 or PR #22.
- Migrating the project to Next.js or another framework.
- Shipping analytics before privacy review.

---

## 21. Implementation sequence after approval

1. Write a task-level implementation plan using Superpowers writing-plans.
2. Create a dedicated implementation branch from the product checkpoint selected at that time.
3. Add public/private route boundaries with tests before changing `/`.
4. Build static landing structure and copy.
5. Add real product evidence and responsive behavior.
6. Run browser QA and accessibility/performance audits.
7. Run Impeccable critique, distill, clarify, audit and polish.
8. Re-run all existing quality, Behavior and E2E belts.
9. Open or update a dedicated draft landing PR.
10. Request product-owner visual review.

---

## 22. Self-review

### Placeholder scan

No required section is left as TBD or TODO. Contact, pricing, testimonials, legal terms, authentication and Ati are explicitly conditional rather than silently incomplete.

### Consistency scan

The recommended root-route migration is separated from the current private app and protected by compatibility tests. The landing does not depend on private store or AI runtime. The design uses existing product identity while allowing greater marketing whitespace.

### Scope scan

This document specifies one public landing surface and its integration boundaries. It does not include exercise-library media production, authentication, pricing or product behavior changes.

### Ambiguity scan

The recommended approach, CTA hierarchy, route direction, no-mascot state, analytics default and acceptance gates are explicit. The product owner’s next decision is approval or requested changes to this specification; implementation remains blocked until that decision.
