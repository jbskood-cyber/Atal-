'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function ContextualModal({
  children,
  onCancel,
  label,
  labelledBy,
  className = '',
}: {
  children: ReactNode;
  onCancel: () => void;
  label?: string;
  labelledBy?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return <dialog
    ref={ref}
    className={`atal-contextual-modal ${className}`.trim()}
    aria-label={label}
    aria-labelledby={labelledBy}
    onKeyDown={(event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }}
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
  >{children}</dialog>;
}
