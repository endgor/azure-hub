import { useState, useEffect, ReactNode } from 'react';

/**
 * Color variant for the banner.
 * Each variant has predefined background, border, and text colors for both light and dark modes.
 */
export type BannerVariant = 'info' | 'warning' | 'success' | 'error';

interface DismissibleBannerProps {
  /**
   * Unique identifier for localStorage persistence.
   * If provided, the dismissed state will be saved to localStorage with key: `banner-dismissed-${storageKey}`
   */
  storageKey?: string;

  /**
   * Banner color variant (defaults to 'info')
   */
  variant?: BannerVariant;

  /**
   * Banner title (optional)
   */
  title?: string;

  /**
   * Banner content - can be text, JSX, or any ReactNode
   */
  children: ReactNode;

  /**
   * Custom className for the banner container
   */
  className?: string;

  /**
   * Callback fired when banner is dismissed
   */
  onDismiss?: () => void;

  /**
   * Controlled visibility (overrides localStorage)
   * If provided, component becomes controlled and localStorage is ignored
   */
  visible?: boolean;
}

const variantStyles: Record<BannerVariant, string> = {
  info: 'border-blue-200 bg-blue-50 dark:border-blue-400/30 dark:bg-blue-500/10',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10',
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-500/10',
  error: 'border-red-200 bg-red-50 dark:border-red-400/30 dark:bg-red-500/10',
};

const variantTextStyles: Record<BannerVariant, string> = {
  info: 'text-blue-900 dark:text-blue-200',
  warning: 'text-amber-900 dark:text-amber-200',
  success: 'text-emerald-900 dark:text-emerald-200',
  error: 'text-red-900 dark:text-red-200',
};

const variantButtonStyles: Record<BannerVariant, string> = {
  info: 'text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/30',
  warning: 'text-amber-600 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30',
  success: 'text-emerald-600 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/30',
  error: 'text-red-600 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/30',
};

/**
 * DismissibleBanner Component
 *
 * A dismissible banner with localStorage persistence and variant styling.
 * Supports SSR by deferring localStorage reads to useEffect.
 *
 * @example
 * ```tsx
 * // Basic usage with localStorage
 * <DismissibleBanner storageKey="welcome-message" title="Welcome!">
 *   This is a dismissible banner with localStorage persistence.
 * </DismissibleBanner>
 *
 * // Warning variant
 * <DismissibleBanner variant="warning" title="Important">
 *   Please review these changes carefully.
 * </DismissibleBanner>
 *
 * // Controlled visibility
 * <DismissibleBanner
 *   visible={showBanner}
 *   onDismiss={() => setShowBanner(false)}
 * >
 *   Controlled banner content
 * </DismissibleBanner>
 * ```
 */
export default function DismissibleBanner({
  storageKey,
  variant = 'info',
  title,
  children,
  className = '',
  onDismiss,
  visible,
}: DismissibleBannerProps) {
  // For controlled mode, use visible prop directly
  // For uncontrolled mode, manage state internally with localStorage
  const [isDismissed, setIsDismissed] = useState(false);
  const isControlled = visible !== undefined;
  const isVisible = isControlled ? visible : !isDismissed;

  // Load dismissed state from localStorage (SSR-safe)
  useEffect(() => {
    if (!isControlled && storageKey && typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(`banner-dismissed-${storageKey}`);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, [storageKey, isControlled]);

  const handleDismiss = () => {
    if (!isControlled) {
      setIsDismissed(true);
      // Persist to localStorage if storageKey is provided
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(`banner-dismissed-${storageKey}`, 'true');
      }
    }

    // Call custom onDismiss callback
    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`relative rounded-xl border p-5 ${variantStyles[variant]} ${className}`}>
      <button
        onClick={handleDismiss}
        className={`absolute right-3 top-3 rounded-lg p-1 ${variantButtonStyles[variant]}`}
        aria-label="Dismiss banner"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="space-y-3 pr-8">
        {title && (
          <h3 className={`text-sm font-semibold ${variantTextStyles[variant]}`}>
            {title}
          </h3>
        )}
        <div className={`text-sm ${variantTextStyles[variant]}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
