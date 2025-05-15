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
        className="w-72 px-4 py-3 text-sm bg-gray-900 text-white rounded-lg 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {content}
          <div className="absolute w-3 h-3 bg-gray-900 transform rotate-45 
                        left-[50%] translate-x-[-50%] bottom-[-6px]"></div>
        </div>
      </div>
    </div>
  );
}
