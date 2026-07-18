import { useEffect } from 'react';

let activeModalCount = 0;
let previousOverflow = '';

export function useModalIsolation(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (activeModalCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.classList.add('atal-context-active');
      document.body.style.overflow = 'hidden';
    }
    activeModalCount += 1;
    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.classList.remove('atal-context-active');
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [active]);
}
