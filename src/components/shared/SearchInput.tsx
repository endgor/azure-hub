import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Optional icon to display on the right side of the input
   * Pass `null` to hide the icon completely
   */
  icon?: ReactNode | null;

  /**
   * Whether to show a loading spinner instead of the icon
   */
  isLoading?: boolean;

  /**
   * Size variant of the input
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Width constraint
   * @default 'sm' - Tailwind max-w-sm (384px)
   */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

  /**
   * Optional container class name
   */
  containerClassName?: string;
}

const sizeClasses = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

const maxWidthClasses = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

/**
 * SearchInput - Reusable search input component with consistent styling
 *
 * A standardized search input that maintains consistent design across the application.
 * Supports loading states, custom icons, and different sizes.
 *
 * @example
 * ```tsx
 * <SearchInput
 *   placeholder="Search..."
 *   value={query}
 *   onChange={(e) => setQuery(e.target.value)}
 *   isLoading={isSearching}
 * />
 * ```
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      icon,
      isLoading = false,
      size = 'md',
      maxWidth = 'sm',
      containerClassName = '',
      className = '',
      ...inputProps
    },
    ref
  ) => {
    const defaultIcon = (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 21l-4.8-4.8m0 0A6 6 0 1010 16a6 6 0 006.2-4.6z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

    const loadingSpinner = <LoadingSpinner size="xs" />;

    // Show icon by default unless explicitly set to null
    const shouldShowIcon = icon !== null;

    return (
      <div className={`relative w-full ${maxWidthClasses[maxWidth]} ${containerClassName}`}>
        <input
          ref={ref}
          className={`w-full rounded-xl border border-slate-300 bg-white ${sizeClasses[size]} ${
            shouldShowIcon ? 'pr-12' : ''
          } shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 ${className}`}
          {...inputProps}
        />
        {shouldShowIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sky-500 transition dark:text-sky-300">
            {isLoading ? loadingSpinner : icon !== undefined ? icon : defaultIcon}
          </div>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
