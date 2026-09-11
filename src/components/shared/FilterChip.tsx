import { ButtonHTMLAttributes, ReactNode } from 'react';

interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  active: boolean;
  children: ReactNode;
}

// Accent fill, not an inverted slate pill: globals.css remaps .dark .bg-slate-900 unlayered, beating dark:bg-white.
export default function FilterChip({ active, className = '', children, ...buttonProps }: FilterChipProps) {
  const stateStyles = active
    ? 'bg-sky-600 text-white hover:bg-sky-700'
    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${stateStyles} ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
