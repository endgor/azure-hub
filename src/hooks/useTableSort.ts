import { useState, useMemo, useCallback } from 'react';

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface SortConfig<T> {
  field: keyof T;
  direction: SortDirection;
}

/**
 * Custom comparator function for sorting
 */
export type SortComparator<T> = (a: T, b: T, direction: SortDirection) => number;

/**
 * Options for useTableSort hook
 */
export interface UseTableSortOptions<T> {
  /**
   * Initial field to sort by
   */
  initialField: keyof T;

  /**
   * Initial sort direction (defaults to 'asc')
   */
  initialDirection?: SortDirection;

  /**
   * Custom comparator functions for specific fields
   * @example { date: (a, b, dir) => compareDates(a.date, b.date, dir) }
   */
  customComparators?: Partial<Record<keyof T, SortComparator<T>>>;

  /**
   * Default comparator for fields without custom comparators
   * If not provided, uses basic string/number comparison
   */
  defaultComparator?: SortComparator<T>;
}

/**
 * Return type for useTableSort hook
 */
export interface UseTableSortReturn<T> {
  /**
   * Currently sorted data
   */
  sortedData: T[];

  /**
   * Current sort configuration
   */
  sortConfig: SortConfig<T>;

  /**
   * Function to handle sort column click
   */
  handleSort: (field: keyof T) => void;

  /**
   * Get sort indicator character for a column (▲ ▼)
   */
  getSortIndicator: (field: keyof T) => string | null;

  /**
   * Get props to spread on sortable table headers
   */
  getSortProps: (field: keyof T) => {
    onClick: () => void;
    className: string;
    'aria-sort': 'ascending' | 'descending' | 'none';
  };
}

/**
 * Default comparator that handles strings, numbers, booleans, and null/undefined
 */
function defaultComparator<T>(a: T, b: T, field: keyof T, direction: SortDirection): number {
  const valueA = a[field];
  const valueB = b[field];

  // Handle null/undefined
  if (valueA == null && valueB == null) return 0;
  if (valueA == null) return 1;
  if (valueB == null) return -1;

  // Convert to comparable values
  const strA = String(valueA);
  const strB = String(valueB);

  const comparison = strA < strB ? -1 : strA > strB ? 1 : 0;
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * useTableSort Hook
 *
 * Provides sortable table functionality with memoized sorting and toggling logic.
 *
 * @param data - Array of data to sort
 * @param options - Sort configuration options
 * @returns Sort state and handlers
 *
 * @example
 * ```tsx
 * interface User {
 *   name: string;
 *   age: number;
 *   email: string;
 * }
 *
 * function UserTable({ users }: { users: User[] }) {
 *   const {
 *     sortedData,
 *     handleSort,
 *     getSortIndicator,
 *     getSortProps
 *   } = useTableSort(users, {
 *     initialField: 'name',
 *     initialDirection: 'asc'
 *   });
 *
 *   return (
 *     <table>
 *       <thead>
 *         <tr>
 *           <th {...getSortProps('name')}>
 *             Name <span className="ml-1">{getSortIndicator('name')}</span>
 *           </th>
 *           <th {...getSortProps('age')}>
 *             Age <span className="ml-1">{getSortIndicator('age')}</span>
 *           </th>
 *         </tr>
 *       </thead>
 *       <tbody>
 *         {sortedData.map(user => (
 *           <tr key={user.email}>
 *             <td>{user.name}</td>
 *             <td>{user.age}</td>
 *           </tr>
 *         ))}
 *       </tbody>
 *     </table>
 *   );
 * }
 * ```
 *
 * @example
 * // With custom comparators
 * ```tsx
 * const { sortedData } = useTableSort(items, {
 *   initialField: 'createdAt',
 *   customComparators: {
 *     createdAt: (a, b, dir) => {
 *       const comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
 *       return dir === 'asc' ? comparison : -comparison;
 *     }
 *   }
 * });
 * ```
 */
export function useTableSort<T extends Record<string, any>>(
  data: T[],
  options: UseTableSortOptions<T>
): UseTableSortReturn<T> {
  const {
    initialField,
    initialDirection = 'asc',
    customComparators,
    defaultComparator: customDefaultComparator,
  } = options;

  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    field: initialField,
    direction: initialDirection,
  });

  // Handle column sort click
  const handleSort = useCallback(
    (field: keyof T) => {
      setSortConfig((prev) => ({
        field,
        direction: field === prev.field && prev.direction === 'asc' ? 'desc' : 'asc',
      }));
    },
    []
  );

  // Sort the data
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return [...data].sort((a, b) => {
      const { field, direction } = sortConfig;

      // Use custom comparator if provided
      const customComparator = customComparators?.[field];
      if (customComparator) {
        return customComparator(a, b, direction);
      }

      // Use custom default comparator if provided
      if (customDefaultComparator) {
        return customDefaultComparator(a, b, direction);
      }

      // Use built-in default comparator
      return defaultComparator(a, b, field, direction);
    });
  }, [data, sortConfig, customComparators, customDefaultComparator]);

  // Get sort indicator character (▲ ▼)
  const getSortIndicator = useCallback(
    (field: keyof T): string | null => {
      if (field !== sortConfig.field) return null;
      return sortConfig.direction === 'asc' ? '▲' : '▼';
    },
    [sortConfig]
  );

  // Get props for sortable table headers
  const getSortProps = useCallback(
    (field: keyof T) => ({
      onClick: () => handleSort(field),
      className: 'cursor-pointer select-none transition hover:bg-slate-100 dark:hover:bg-slate-800',
      'aria-sort': (
        field === sortConfig.field
          ? sortConfig.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      ) as 'ascending' | 'descending' | 'none',
    }),
    [handleSort, sortConfig]
  );

  return {
    sortedData,
    sortConfig,
    handleSort,
    getSortIndicator,
    getSortProps,
  };
}
