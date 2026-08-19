import { ReactNode, useId, useRef, useState } from 'react';
import { useTooltipPosition } from './useTooltipPosition';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  /** Width utility for the bubble */
  widthClass?: string;
}

export default function Tooltip({ children, content, widthClass = 'w-72' }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { top, left } = useTooltipPosition(triggerRef, isOpen);
  const tooltipId = `${useId()}-tooltip`;

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        tabIndex={0}
        aria-describedby={isOpen ? tooltipId : undefined}
        className="cursor-help rounded outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
        }}
      >
        {children}
      </div>

      {isOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            zIndex: 9999,
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            // Sits the bubble directly above the trigger whatever its height.
            transform: 'translate(-50%, -100%)'
          }}
          // Table cells set whitespace-nowrap and text alignment, which the bubble would
          // otherwise inherit and overflow, so those are reset here.
          className={`${widthClass} pointer-events-none whitespace-normal break-words rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-normal normal-case tracking-normal text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200`}
        >
          <div className="relative">
            {content}
            <div className="absolute bottom-[-18px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}
