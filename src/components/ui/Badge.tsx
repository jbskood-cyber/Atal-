import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function Badge({ children, icon }: BadgeProps) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ECFDF5] text-[#065F46] text-xs font-semibold rounded-full border border-[#D1FAE5] uppercase tracking-wider mb-4">
      {icon && <span className="flex items-center shrink-0">{icon}</span>}
      {children}
    </div>
  );
}
