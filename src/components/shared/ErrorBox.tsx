import { ReactNode } from 'react';

export type ErrorBoxVariant = 'error' | 'warning';

interface ErrorBoxProps {
  /**
   * The error message or content to display
   */
  children: ReactNode;

  /**
   * Optional title for the error box
   */
  title?: string;

  /**
   * Variant of the error box (error = red, warning = amber)
   * @default 'error'
   */
  variant?: ErrorBoxVariant;

  /**
   * Custom className for the container
   */
  className?: string;
}

const variantStyles: Record<ErrorBoxVariant, string> = {
  error: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200',
};

const titleStyles: Record<ErrorBoxVariant, string> = {
  error: 'text-rose-800 dark:text-rose-200',
  warning: 'text-amber-800 dark:text-amber-200',
};

const contentStyles: Record<ErrorBoxVariant, string> = {
  error: 'text-rose-700 dark:text-rose-300',
  warning: 'text-amber-700 dark:text-amber-200',
};

/**
 * ErrorBox Component
 *
 * A reusable component for displaying error and warning messages with consistent styling.
 *
 * @example
 * ```tsx
 * // Simple error message
 * <ErrorBox>
 *   Failed to load data
 * </ErrorBox>
 *
 * // Error with title
 * <ErrorBox title="Lookup failed">
 *   The tenant could not be found
 * </ErrorBox>
 *
 * // Warning message
 * <ErrorBox variant="warning" title="Notice">
 *   This feature is experimental
 * </ErrorBox>
 * ```
 */
export default function ErrorBox({
  children,
  title,
  variant = 'error',
  className = '',
}: ErrorBoxProps) {
  return (
    <div className={`rounded-xl border p-5 text-sm shadow-sm ${variantStyles[variant]} ${className}`}>
      {title && (
        <h2 className={`font-semibold ${titleStyles[variant]}`}>
          {title}
        </h2>
      )}
      <div className={title ? `mt-1 ${contentStyles[variant]}` : contentStyles[variant]}>
        {children}
      </div>
    </div>
  );
}
