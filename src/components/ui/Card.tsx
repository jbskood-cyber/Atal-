import React from 'react';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Card({ title, icon, children }: CardProps) {
  return (
    <div className="border border-[#F1F5F9] bg-[#FAFBFC] p-5 rounded-xl">
      <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3.5 flex items-center gap-2">
        {icon && <span className="flex items-center shrink-0">{icon}</span>}
        {title}
      </div>
      {children}
    </div>
  );
}
