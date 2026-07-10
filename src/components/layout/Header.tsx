import React from 'react';

interface HeaderProps {
  label: string;
}

export function Header({ label }: HeaderProps) {
  return (
    <div className="h-10 bg-[#F1F5F9] border-b border-[#E2E8F0] flex items-center px-4 gap-2">
      <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
      <div className="ml-auto font-mono text-[11px] text-[#94A3B8] font-medium tracking-wide">
        {label}
      </div>
    </div>
  );
}
