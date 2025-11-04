import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * Size of the button
   * @default 'md'
   */
  size?: ButtonSize;

  /**
   * Optional icon to display before the text
   */
  icon?: ReactNode;

  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;

  /**
   * Whether the button should take full width
   */
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500/50 disabled:bg-sky-600 dark:bg-sky-600 dark:text-white dark:hover:bg-sky-700',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500/50 disabled:bg-rose-600 dark:bg-rose-700 dark:hover:bg-rose-800',
  ghost:
    'text-slate-700 hover:bg-slate-100 focus:ring-slate-500/50 dark:text-slate-200 dark:hover:bg-slate-800',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
};

/**
 * Button Component
 *
 * A reusable button component with consistent styling and multiple variants.
 *
 * @example
 * ```tsx
 * // Primary button
 * <Button onClick={handleClick}>
 *   Save Changes
 * </Button>
 *
 * // Secondary button
 * <Button variant="secondary" onClick={handleCancel}>
 *   Cancel
 * </Button>
 *
 * // Loading state
 * <Button isLoading disabled>
 *   Saving...
 * </Button>
 *
 * // With icon
 * <Button icon={<PlusIcon />}>
 *   Add Item
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      isLoading = false,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...buttonProps
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${fullWidth ? 'flex' : 'inline-flex'} items-center gap-2 rounded-lg font-medium shadow-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          // Only apply justify-center if no justify class is provided in className
          className.includes('justify-') ? '' : 'justify-center'
        } ${variantStyles[variant]} ${sizeStyles[size]} ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
        {...buttonProps}
      >
        {isLoading && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {!isLoading && icon && <span className="shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
