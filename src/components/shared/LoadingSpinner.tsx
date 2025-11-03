/**
 * Size variant for the loading spinner.
 */
export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Color variant for the loading spinner.
 */
export type SpinnerColor = 'primary' | 'secondary' | 'white' | 'gray';

interface LoadingSpinnerProps {
  /**
   * Size of the spinner (defaults to 'md')
   */
  size?: SpinnerSize;

  /**
   * Color variant (defaults to 'primary')
   */
  color?: SpinnerColor;

  /**
   * Optional label to display below the spinner
   */
  label?: string;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Whether to center the spinner in its container (defaults to false)
   */
  centered?: boolean;
}

const sizeStyles: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
  xl: 'h-10 w-10 border-2',
};

const colorStyles: Record<SpinnerColor, string> = {
  primary: 'border-sky-500/70 border-t-transparent',
  secondary: 'border-slate-500/70 border-t-transparent',
  white: 'border-white/70 border-t-transparent',
  gray: 'border-gray-500/70 border-t-transparent',
};

const labelSizeStyles: Record<SpinnerSize, string> = {
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

/**
 * LoadingSpinner Component
 *
 * A flexible loading spinner with size and color variants.
 *
 * @example
 * ```tsx
 * // Basic spinner
 * <LoadingSpinner />
 *
 * // Small spinner with custom color
 * <LoadingSpinner size="sm" color="secondary" />
 *
 * // Centered spinner with label
 * <LoadingSpinner size="lg" label="Loading..." centered />
 *
 * // Inline spinner
 * <div className="flex items-center gap-2">
 *   <LoadingSpinner size="xs" />
 *   <span>Processing...</span>
 * </div>
 * ```
 */
export default function LoadingSpinner({
  size = 'md',
  color = 'primary',
  label,
  className = '',
  centered = false,
}: LoadingSpinnerProps) {
  const containerStyles = centered ? 'flex flex-col items-center justify-center' : 'inline-flex flex-col items-center';

  return (
    <div className={`${containerStyles} gap-2 ${className}`} role="status" aria-live="polite">
      <div
        className={`animate-spin rounded-full ${sizeStyles[size]} ${colorStyles[color]}`}
        aria-label={label || 'Loading'}
      />
      {label && (
        <span className={`text-slate-600 dark:text-slate-400 ${labelSizeStyles[size]}`}>
          {label}
        </span>
      )}
      <span className="sr-only">{label || 'Loading'}</span>
    </div>
  );
}
