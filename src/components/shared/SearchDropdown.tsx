import { useState, useRef, useEffect, ReactNode } from 'react';

/**
 * Generic result item for the dropdown.
 * T should have at minimum an 'id' property for keys.
 */
export interface SearchDropdownItem {
  id: string;
  content: ReactNode;
  [key: string]: any;
}

interface SearchDropdownProps<T extends SearchDropdownItem> {
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;

  /**
   * Current search value
   */
  value: string;

  /**
   * Callback fired when search value changes
   */
  onChange: (value: string) => void;

  /**
   * Array of search results to display
   */
  results: T[];

  /**
   * Callback fired when a result item is selected
   */
  onSelect: (item: T) => void;

  /**
   * Whether the dropdown is currently loading
   */
  isLoading?: boolean;

  /**
   * Message to display when no results are found
   */
  emptyMessage?: string;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Custom className for the dropdown results container
   */
  dropdownClassName?: string;

  /**
   * Whether to show the dropdown (controlled mode)
   */
  showDropdown?: boolean;

  /**
   * Callback fired when dropdown should close
   */
  onClose?: () => void;

  /**
   * Maximum height for the results container (defaults to '400px')
   */
  maxHeight?: string;

  /**
   * Optional icon to display in the search input
   */
  inputIcon?: ReactNode;

  /**
   * Optional loading spinner override
   */
  loadingComponent?: ReactNode;

  /**
   * Callback to determine if dropdown should show based on search value
   */
  shouldShowDropdown?: (value: string) => boolean;
}

/**
 * SearchDropdown Component
 *
 * A reusable search dropdown with click-outside detection, loading states, and keyboard navigation.
 *
 * @example
 * ```tsx
 * interface Action {
 *   id: string;
 *   name: string;
 *   description: string;
 * }
 *
 * const [search, setSearch] = useState('');
 * const [results, setResults] = useState<Action[]>([]);
 *
 * <SearchDropdown
 *   placeholder="Search actions..."
 *   value={search}
 *   onChange={setSearch}
 *   results={results.map(r => ({
 *     id: r.id,
 *     content: (
 *       <div>
 *         <div className="font-semibold">{r.name}</div>
 *         <div className="text-xs text-gray-500">{r.description}</div>
 *       </div>
 *     )
 *   }))}
 *   onSelect={(item) => console.log('Selected:', item.id)}
 *   isLoading={isSearching}
 * />
 * ```
 */
export default function SearchDropdown<T extends SearchDropdownItem>({
  placeholder = 'Search...',
  value,
  onChange,
  results,
  onSelect,
  isLoading = false,
  emptyMessage = 'No results found',
  className = '',
  dropdownClassName = '',
  showDropdown,
  onClose,
  maxHeight = '400px',
  inputIcon,
  loadingComponent,
  shouldShowDropdown,
}: SearchDropdownProps<T>) {
  const [internalShowDropdown, setInternalShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine if dropdown should be shown
  const isDropdownVisible = showDropdown !== undefined ? showDropdown : internalShowDropdown;

  // Click-outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (showDropdown === undefined) {
          setInternalShowDropdown(false);
        }
        onClose?.();
      }
    }

    if (isDropdownVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownVisible, onClose, showDropdown]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    if (showDropdown === undefined) {
      // Auto-show dropdown based on value or custom logic
      const shouldShow = shouldShowDropdown ? shouldShowDropdown(newValue) : newValue.length > 0;
      setInternalShowDropdown(shouldShow);
    }
  };

  const handleSelect = (item: T) => {
    onSelect(item);
    if (showDropdown === undefined) {
      setInternalShowDropdown(false);
    }
  };

  const handleInputFocus = () => {
    if (showDropdown === undefined && value.length > 0) {
      setInternalShowDropdown(true);
    }
  };

  const defaultLoadingSpinner = (
    <div className="flex items-center justify-center p-4">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
    </div>
  );

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 pr-10 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-sky-400"
        />
        {inputIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
            ) : (
              inputIcon
            )}
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isDropdownVisible && (
        <div
          className={`absolute z-10 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 ${dropdownClassName}`}
          style={{ maxHeight }}
        >
          {isLoading ? (
            loadingComponent || defaultLoadingSpinner
          ) : results.length > 0 ? (
            <div className="overflow-auto" style={{ maxHeight }}>
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full border-b border-slate-100 p-3 text-left transition hover:bg-slate-50 last:border-b-0 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  {item.content}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
