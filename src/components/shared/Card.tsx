import { ReactNode } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  /**
   * The content to display inside the card
   */
  children: ReactNode;

  /**
   * Optional title for the card header
   */
  title?: string;

  /**
   * Optional description or subtitle
   */
  description?: string;

  /**
   * Padding size
   * @default 'md'
   */
  padding?: CardPadding;

  /**
   * Whether to show shadow
   * @default true
   */
  shadow?: boolean;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Custom className for the content area
   */
  contentClassName?: string;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * Card Component
 *
 * A reusable container component with consistent border, background, and styling.
 *
 * @example
 * ```tsx
 * // Simple card
 * <Card>
 *   <p>Card content</p>
 * </Card>
 *
 * // Card with title
 * <Card title="Results">
 *   <p>Your search results</p>
 * </Card>
 *
 * // Card with custom padding
 * <Card padding="lg" title="Settings">
 *   <p>Configuration options</p>
 * </Card>
 * ```
 */
export default function Card({
  children,
  title,
  description,
  padding = 'md',
  shadow = true,
  className = '',
  contentClassName = '',
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${
        shadow ? 'shadow-sm' : ''
      } ${className}`}
    >
      {(title || description) && (
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          {title && (
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {description}
            </p>
          )}
        </div>
      )}
      <div className={`${paddingStyles[padding]} ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
