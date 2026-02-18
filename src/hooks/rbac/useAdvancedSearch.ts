import { useState, useCallback, useRef, useEffect } from 'react';
import type { Operation } from '@/types/rbac';

export interface UseAdvancedSearchProps {
  onSearch: (query: string) => Promise<Operation[]>;
}

export interface UseAdvancedSearchReturn {
  actionsInput: string;
  searchResults: Operation[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleSearch: (query: string) => void;
  handleAddAction: (action: string) => void;
  setActionsInputDirect: (value: string) => void;
  clearSearch: () => void;
  clearResults: () => void;
}

const ADVANCED_SEARCH_DEBOUNCE_MS = 250;

export function useAdvancedSearch({ onSearch }: UseAdvancedSearchProps): UseAdvancedSearchReturn {
  const [actionsInput, setActionsInput] = useState('');
  const [searchResults, setSearchResults] = useState<Operation[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchRequestRef = useRef(0);

  const cancelPendingSearch = useCallback(() => {
    latestSearchRequestRef.current += 1;
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelPendingSearch(), [cancelPendingSearch]);

  const handleSearch = useCallback((query: string) => {
    setActionsInput(query);
    cancelPendingSearch();

    const textarea = textareaRef.current;
    if (!textarea) {
      setSearchResults([]);
      return;
    }

    const cursorPosition = textarea.selectionStart;
    const lines = query.split('\n');
    let charCount = 0;
    let currentLineText = '';

    for (const line of lines) {
      if (cursorPosition <= charCount + line.length) {
        currentLineText = line;
        break;
      }
      charCount += line.length + 1;
    }

    const trimmedLine = currentLineText.trim();
    if (trimmedLine.length < 3 || trimmedLine.startsWith('#')) {
      setSearchResults([]);
      return;
    }

    const requestId = latestSearchRequestRef.current;
    const timeoutId = setTimeout(async () => {
      try {
        const results = await onSearch(trimmedLine);
        if (latestSearchRequestRef.current !== requestId) return;
        setSearchResults(results.slice(0, 50));
      } catch {
        if (latestSearchRequestRef.current !== requestId) return;
        setSearchResults([]);
      } finally {
        if (searchTimeoutRef.current === timeoutId) {
          searchTimeoutRef.current = null;
        }
      }
    }, ADVANCED_SEARCH_DEBOUNCE_MS);
    searchTimeoutRef.current = timeoutId;
  }, [cancelPendingSearch, onSearch]);

  const handleAddAction = useCallback((action: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const lines = actionsInput.split('\n');
    let charCount = 0;
    let currentLineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (cursorPosition <= charCount + lines[i].length) {
        currentLineIndex = i;
        break;
      }
      charCount += lines[i].length + 1;
    }

    const newLines = [...lines];
    newLines[currentLineIndex] = action;
    const newText = newLines.join('\n');
    cancelPendingSearch();
    setActionsInput(newText);
    setSearchResults([]);

    setTimeout(() => {
      if (textarea) {
        const newCursorPosition = newLines.slice(0, currentLineIndex).join('\n').length +
                                   (currentLineIndex > 0 ? 1 : 0) +
                                   action.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  }, [actionsInput, cancelPendingSearch]);

  const setActionsInputDirect = useCallback((value: string) => {
    cancelPendingSearch();
    setActionsInput(value);
    setSearchResults([]);
  }, [cancelPendingSearch]);

  const clearSearch = useCallback(() => {
    cancelPendingSearch();
    setActionsInput('');
    setSearchResults([]);
  }, [cancelPendingSearch]);

  const clearResults = useCallback(() => {
    cancelPendingSearch();
    setSearchResults([]);
  }, [cancelPendingSearch]);

  return {
    actionsInput,
    searchResults,
    textareaRef,
    handleSearch,
    handleAddAction,
    setActionsInputDirect,
    clearSearch,
    clearResults,
  };
}
