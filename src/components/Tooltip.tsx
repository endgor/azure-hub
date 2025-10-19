import { ReactNode, useRef } from 'react';
import { useTooltipPosition } from './useTooltipPosition';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
}

export default function Tooltip({ children, content }: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const { top, left } = useTooltipPosition(triggerRef);

  return (
    <div className="relative inline-block group">
      <div ref={triggerRef} className="cursor-help">
        {children}
      </div>
      <div 
        style={{
          zIndex: 9999,
          position: 'fixed',
          top: `${top - 120}px`,
          left: `${left}px`,
          transform: 'translateX(-50%)'
        }}
        className="w-72 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl opacity-0 transition-opacity duration-200
                    group-hover:opacity-100 pointer-events-none normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {content}
          <div className="absolute bottom-[-6px] left-[50%] h-3 w-3 translate-x-[-50%] rotate-45 border border-slate-200 bg-white"></div>
        </div>
      </div>
    </div>
  );
}
