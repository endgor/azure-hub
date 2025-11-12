import { useState, useCallback } from 'react';

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
  handleActionSearchChange: (query: string) => Promise<void>;
  clearActionSearch: () => void;
}

/**
 * Hook for managing action search functionality.
 * Handles async action search with debouncing logic.
 */
export function useActionSearch({ onSearch }: UseActionSearchProps): UseActionSearchReturn {
  const [actionSearchQuery, setActionSearchQuery] = useState('');
  const [actionSearchResults, setActionSearchResults] = useState<ActionSearchResult[]>([]);

  // Handle action search
  const handleActionSearchChange = useCallback(async (query: string) => {
    setActionSearchQuery(query);

    if (!query.trim() || query.length < 3) {
      setActionSearchResults([]);
      return;
    }

    try {
      const results = await onSearch(query);
      setActionSearchResults(results.slice(0, 10));
    } catch (err) {
      console.error('Action search failed:', err);
      setActionSearchResults([]);
    }
  }, [onSearch]);

  const clearActionSearch = useCallback(() => {
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
