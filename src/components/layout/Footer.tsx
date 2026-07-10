import React from 'react';

interface FooterProps {
  note: string;
  technologies: string[];
}

export function Footer({ note, technologies }: FooterProps) {
  return (
    <div className="mt-10 pt-6 border-t border-[#F1F5F9] w-full flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#94A3B8]">
      <div className="text-center sm:text-left">
        {note}
      </div>
      <div className="flex gap-2 font-medium">
        {technologies.map((tech, index) => (
          <React.Fragment key={tech}>
            <span>{tech}</span>
            {index < technologies.length - 1 && <span>•</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
