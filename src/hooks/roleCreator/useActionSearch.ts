import { useState, useCallback, useRef } from 'react';

export interface ActionSearchResult {
  name: string;
  description?: string;
}

export interface UseActionSearchProps {
  onSearch: (query: string) => Promise<ActionSearchResult[]>;
}

export interface UseActionSearchReturn {
  actionSearchQuery: string;
  actionSearchResults: ActionSearchResult[];
  setActionSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  handleActionSearchChange: (query: string) => void;
  clearActionSearch: () => void;
}

const DEBOUNCE_MS = 300;

/**
 * Hook for managing action search functionality.
 * Debounces API calls to avoid hitting rate limits on rapid typing.
 */
export function useActionSearch({ onSearch }: UseActionSearchProps): UseActionSearchReturn {
  const [actionSearchQuery, setActionSearchQuery] = useState('');
  const [actionSearchResults, setActionSearchResults] = useState<ActionSearchResult[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleActionSearchChange = useCallback((query: string) => {
    setActionSearchQuery(query);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!query.trim() || query.length < 3) {
      setActionSearchResults([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await onSearch(query);
        setActionSearchResults(results.slice(0, 10));
      } catch {
        setActionSearchResults([]);
      }
    }, DEBOUNCE_MS);
  }, [onSearch]);

  const clearActionSearch = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setActionSearchQuery('');
    setActionSearchResults([]);
  }, []);

  return {
    actionSearchQuery,
    actionSearchResults,
    setActionSearchQuery,
    handleActionSearchChange,
    clearActionSearch,
  };
}
