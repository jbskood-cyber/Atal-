# Block 4.2 — Responsive, accessibility and performance contract

## 1. Target devices

The contextual workspace is mobile-first and must be validated at minimum at:

- 360 × 800;
- 390 × 844;
- 412 × 915;
- 430 × 932.

A tablet/desktop smoke is also required to ensure the floating workspace does not become an oversized dashboard or break the existing layout.

## 2. Closed-state geometry

The orb and exterior actions must:

- sit above the bottom navigation and device safe area;
- remain reachable by the thumb;
- preserve at least the existing navigation spacing;
- avoid primary page actions such as `Crear plan`, save controls or report actions;
- move or collapse when available horizontal space is insufficient;
- never create horizontal page overflow;
- keep a minimum interactive target of 44 × 44 CSS px;
- maintain visible focus indication.

At narrow widths, exterior actions may collapse to one highest-value action plus the orb. They may not wrap into a dense two-line toolbar over clinical content.

## 3. Open-state geometry

The open workspace must:

- use the area released by the hidden bottom navigation;
- respect left, right and bottom safe areas;
- remain visually separated from the underlying page through border, translucency and restrained shadow;
- avoid extending beyond the viewport;
- maintain a stable header and composer;
- allow the main work area to scroll internally;
- avoid more than one competing vertical scroll area on mobile;
- leave a meaningful amount of the current clinical screen visible behind it when the keyboard is closed;
- expand upward as needed when the keyboard opens.

The bottom navigation must not remain visible behind translucent workspace content.

## 4. Keyboard behavior

Required behavior on Android and iOS:

- focusing the composer does not move the underlying page to the top;
- the composer remains fully visible above the keyboard;
- send/microphone controls remain tappable;
- the workspace header remains reachable by internal scrolling or a stable layout;
- closing the keyboard retains message text and workspace mode;
- multiline text grows to a bounded height and then scrolls internally;
- confirmation and apply controls are not trapped beneath the keyboard;
- no double viewport resize animation causes a visible jump.

The implementer must test with the virtual keyboard behavior available in the browser environment and perform a final real-preview smoke when possible.

## 5. Safe areas

Use CSS environment insets or existing application safe-area utilities.

Required insets:

- bottom composer padding;
- closed orb position;
- workspace side margins where not already handled by the app shell;
- top edge only when the workspace can approach a device cutout in expanded keyboard mode.

Do not hardcode one device's bottom inset.

## 6. Themes

The workspace must support:

- current light/Blue Clinical presentation;
- Graphite Clinical dark presentation.

Requirements:

- text and controls meet readable contrast;
- Liquid Glass surfaces remain distinguishable from the underlying page;
- translucent layers do not inherit illegible page content;
- focus rings remain visible;
- disabled controls remain understandable without relying only on opacity;
- success, confirmation, conflict and error states use existing semantic hierarchy and copy rather than adding prohibited red/yellow/beige-heavy cards;
- the Atal symbol remains recognizable.

## 7. Accessibility semantics

### Trigger and actions

- orb has an accessible name such as `Abrir Atal IA para este paciente`;
- status indicator is either decorative or represented in accessible text;
- each exterior action is a real button with a specific name;
- unavailable actions are not keyboard focusable.

### Workspace

- use dialog/sheet semantics appropriate to the implementation;
- label the workspace with its title and context;
- announce context changes;
- minimize and close have distinct accessible names;
- focus is contained while open without trapping the user behind nested overlays;
- confirmation dialogs become the top focus scope;
- background clinical content is not reachable by keyboard while the workspace is modal to interaction.

### Conversation and results

- new assistant responses use a polite `aria-live` region;
- loading states are announced once;
- error and conflict states use alert semantics where appropriate;
- draft progress is not communicated by color alone;
- collapsible sections expose expanded state;
- undo availability is announced after a successful write.

### Composer

- text input has a visible or programmatic label;
- microphone and send names reflect their current function;
- changing from microphone to send does not unexpectedly move focus;
- keyboard shortcuts do not bypass confirmation.

## 8. Motion

Allowed motion:

- short open/minimize/close transition;
- subtle content fade/slide;
- restrained orb availability pulse.

Requirements:

- no springy or decorative motion that delays interaction;
- no continuous glow in reduced-motion mode;
- no layout shift from delayed blur or font loading;
- reduced motion renders near-instant state changes while preserving orientation;
- all critical controls are available before animation completes.

## 9. Performance budgets

The contextual workspace must not make ordinary navigation or current screen rendering slower.

Targets:

- closed trigger adds negligible render cost;
- heavy conversation/draft components are lazy-mounted only when opened;
- opening shows the shell immediately and may use a small internal skeleton while conversation data loads;
- no Gemini request blocks the opening transition;
- no full store reinitialization occurs when opening;
- no whole-app subscription causes every message token or input keystroke to rerender all clinical screens;
- avoid adding a second large UI framework or runtime dependency;
- production bundle growth must be measured and documented;
- existing service worker/PWA behavior must remain intact.

## 10. Scroll and layout performance

- use one controlled underlying-page lock while open;
- avoid reading and writing layout repeatedly in one frame;
- capture scroll once during transition;
- restore scroll after the workspace is hidden, not during its exit animation;
- avoid fixed heights based on JavaScript when CSS viewport/safe-area units suffice;
- conversation lists should not rerender the complete transcript for composer keystrokes;
- long transcripts may need windowing only if measurement proves a problem; do not add premature complexity.

## 11. Loading and skeletons

Opening must never display a blank white panel.

Possible states:

- shell and context header render immediately;
- actions/suggestions use compact skeleton rows while derived context loads;
- conversation shows existing messages or a minimal empty state;
- draft pane appears only when a real draft/result exists.

Skeletons must match the final geometry and theme. Do not show a full-page skeleton over the underlying clinical screen.

## 12. Error resilience

The workspace must remain closable/minimizable when:

- Gemini request fails;
- conversation persistence fails;
- a draft is malformed;
- context entity no longer exists;
- a route changes unexpectedly;
- an undo receipt expires.

No error should leave the bottom navigation permanently hidden after the workspace closes.

## 13. Required measurements and evidence

The final checkpoint must record:

- viewport matrix results;
- light and Graphite screenshots/artifacts;
- keyboard/composer behavior;
- horizontal overflow checks;
- page and console errors;
- route and scroll preservation;
- bundle output before/after or final measured output with comparison to the Block 4.1 baseline;
- any known visual limitation.

## 14. Failure conditions

The responsive/accessibility contract fails if:

- the orb covers a primary action;
- the open workspace exposes the bottom navigation underneath;
- the composer is hidden by the keyboard;
- two nested scroll areas fight on mobile;
- focus reaches background content while open;
- close/minimize loses focus or scroll;
- dark mode makes glass surfaces unreadable;
- reduced motion still pulses continuously;
- opening waits for Gemini before rendering;
- a recoverable error leaves the app shell in the open/hidden-navigation state.