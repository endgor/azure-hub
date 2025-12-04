import { useState, useCallback, useRef } from 'react';
import type { Operation } from '@/types/rbac';

export interface UseAdvancedSearchProps {
  onSearch: (query: string) => Promise<Operation[]>;
}

export interface UseAdvancedSearchReturn {
  actionsInput: string;
  searchResults: Operation[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleSearch: (query: string) => Promise<void>;
  handleAddAction: (action: string) => void;
  setActionsInputDirect: (value: string) => void;
  clearSearch: () => void;
  clearResults: () => void;
}

export function useAdvancedSearch({ onSearch }: UseAdvancedSearchProps): UseAdvancedSearchReturn {
  const [actionsInput, setActionsInput] = useState('');
  const [searchResults, setSearchResults] = useState<Operation[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSearch = useCallback(async (query: string) => {
    setActionsInput(query);

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

    try {
      const results = await onSearch(trimmedLine);
      setSearchResults(results.slice(0, 10));
    } catch (err) {
      console.warn('Search failed:', err);
      setSearchResults([]);
    }
  }, [onSearch]);

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
  }, [actionsInput]);

  const setActionsInputDirect = useCallback((value: string) => {
    setActionsInput(value);
    setSearchResults([]);
  }, []);

  const clearSearch = useCallback(() => {
    setActionsInput('');
    setSearchResults([]);
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults([]);
  }, []);

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
