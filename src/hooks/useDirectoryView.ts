'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Remembers list-only presentation state for the current browser tab.
 * Never saves patient records or treatment data; only text filters, sort order
 * and scroll offset. No clinical store, URL or server mutations.
 */
export function useDirectoryView<T extends { query: string; filter: string }>(
  name: 'patients' | 'plans',
  defaults: T,
  isValid: (value: unknown) => value is T,
): {
  view: T;
  setView: Dispatch<SetStateAction<T>>;
  rememberDeparture: () => void;
} {
  const [view, setView] = useState<T>(defaults);
  const [restored, setRestored] = useState(false);
  const key = `atal:directory-view:v1:${name}`;
  const scrollKey = `${key}:scroll`;

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValid(parsed)) setView(parsed);
      }
    } catch {
      // Session storage may be unavailable; the directory still works.
    } finally {
      setRestored(true);
    }
  }, [key, isValid]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(view));
    } catch {
      // Storage is an enhancement only.
    }
  }, [key, restored, view]);

  useEffect(() => {
    if (!restored) return;
    let savedScroll = 0;
    try { savedScroll = Number(window.sessionStorage.getItem(scrollKey) ?? '0'); } catch {}
    if (!Number.isFinite(savedScroll) || savedScroll <= 0) return;

    // Wait for restored filters to render before returning to the prior row.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: savedScroll, behavior: 'instant' });
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [restored, scrollKey]);

  const rememberDeparture = useCallback(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(view));
      window.sessionStorage.setItem(scrollKey, String(window.scrollY));
    } catch {
      // Never block opening a patient or plan when session storage is disabled.
    }
  }, [key, scrollKey, view]);

  return { view, setView, rememberDeparture };
}
