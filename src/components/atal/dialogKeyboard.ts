import type { KeyboardEvent } from 'react';

/**
 * Keep keyboard navigation inside a visible dialog, using current descendants
 * rather than cached nodes (results and buttons can change dynamically).
 * Does not touch application state or register global key handlers.
 */
const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function keepDialogTabFocus(event: KeyboardEvent<HTMLElement>, container: HTMLElement) {
  if (event.key !== 'Tab') return;
  const options = [...container.querySelectorAll<HTMLElement>(focusableSelector)].filter(
    (item) => item.getClientRects().length > 0 && item.getAttribute('aria-hidden') !== 'true'
      && !item.closest('[inert]'),
  );
  if (!options.length) {
    event.preventDefault();
    container.focus();
    return;
  }
  const first = options[0];
  const last = options[options.length - 1];
  const focused = document.activeElement;
  if (!container.contains(focused)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && focused === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && focused === last) {
    event.preventDefault();
    first.focus();
  }
}
