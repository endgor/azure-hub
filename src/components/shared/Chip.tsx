import { ReactNode } from 'react';

/**
 * Color variant for the chip.
 * Each variant has predefined background, border, and text colors.
 */
export type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

/**
 * Size variant for the chip.
 */
export type ChipSize = 'sm' | 'md' | 'lg';

interface ChipProps {
  /**
   * Content to display inside the chip (can be text or JSX)
   */
  children: ReactNode;

  /**
   * Callback fired when remove button is clicked.
   * If provided, a remove button will be shown.
   */
  onRemove?: () => void;

  /**
   * Aria label for the remove button
   */
  removeAriaLabel?: string;

  /**
   * Color variant (defaults to 'default')
   */
  variant?: ChipVariant;

  /**
   * Size variant (defaults to 'md')
   */
  size?: ChipSize;

  /**
   * Custom className for the chip container
   */
  className?: string;

  /**
   * Optional click handler for the chip itself
   */
  onClick?: () => void;

  /**
   * Optional icon to display before content
   */
  icon?: ReactNode;
}

const variantStyles: Record<ChipVariant, string> = {
  default: 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800',
  primary: 'border-sky-300 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/30',
  success: 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/30',
  warning: 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/30',
  error: 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/30',
};

const sizeStyles: Record<ChipSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

const iconSizeStyles: Record<ChipSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

/**
 * Chip Component
 *
 * A flexible chip/tag component with remove button support and variant styling.
 *
 * @example
 * ```tsx
 * // Basic chip
 * <Chip>Basic tag</Chip>
 *
 * // Removable chip
 * <Chip onRemove={() => console.log('removed')} removeAriaLabel="Remove tag">
 *   Removable tag
 * </Chip>
 *
 * // Chip with variant and size
 * <Chip variant="primary" size="lg">
 *   Large primary chip
 * </Chip>
 *
 * // Chip with icon
 * <Chip icon={<UserIcon />} onRemove={handleRemove}>
 *   User: John Doe
 * </Chip>
 *
 * // Clickable chip
 * <Chip onClick={() => console.log('clicked')}>
 *   Click me
 * </Chip>
 * ```
 */
export default function Chip({
  children,
  onRemove,
  removeAriaLabel = 'Remove',
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
  icon,
}: ChipProps) {
  const baseStyles = 'inline-flex items-center gap-2 rounded-md border shadow-sm';
  const interactiveStyles = onClick ? 'cursor-pointer hover:opacity-80 transition' : '';

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${interactiveStyles} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {icon && (
        <span className={`shrink-0 ${iconSizeStyles[size]}`}>
          {icon}
        </span>
      )}

      <div className="max-w-md">{children}</div>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // Prevent onClick from firing when removing
            onRemove();
          }}
          aria-label={removeAriaLabel}
          className="shrink-0 text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={iconSizeStyles[size]}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
