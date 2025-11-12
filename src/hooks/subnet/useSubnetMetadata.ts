import { useState, useCallback, useEffect } from 'react';

/**
 * Merges properties from child nodes to their parent during join operations.
 * If both children have the same value, it's preserved.
 * If they differ, use the conflictValue (or undefined to remove).
 */
function mergeChildProperties<T>(
  current: Record<string, T>,
  childIds: [string, string],
  parentId: string,
  conflictValue: T | undefined
): Record<string, T> {
  const leftValue = current[childIds[0]];
  const rightValue = current[childIds[1]];
  const next = { ...current };
  let mutated = false;

  if (childIds[0] in next) {
    delete next[childIds[0]];
    mutated = true;
  }
  if (childIds[1] in next) {
    delete next[childIds[1]];
    mutated = true;
  }

  const mergedValue =
    leftValue && rightValue
      ? leftValue === rightValue
        ? leftValue
        : conflictValue
      : leftValue || rightValue || conflictValue;

  if (mergedValue) {
    if (next[parentId] !== mergedValue) {
      next[parentId] = mergedValue;
      mutated = true;
    }
  } else if (parentId in next) {
    delete next[parentId];
    mutated = true;
  }

  return mutated ? next : current;
}

/**
 * Removes metadata entries for leaf nodes that no longer exist.
 */
function cleanupRemovedLeaves<T>(
  current: Record<string, T>,
  validLeafIds: Set<string>
): Record<string, T> {
  let mutated = false;
  const next: Record<string, T> = {};

  Object.entries(current).forEach(([leafId, value]) => {
    if (validLeafIds.has(leafId)) {
      next[leafId] = value;
    } else {
      mutated = true;
    }
  });

  return mutated ? next : current;
}

export interface UseSubnetMetadataReturn {
  rowColors: Record<string, string>;
  setRowColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  rowComments: Record<string, string>;
  setRowComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  activeCommentRow: string | null;
  commentDraft: string;
  setCommentDraft: React.Dispatch<React.SetStateAction<string>>;
  openCommentEditor: (leafId: string) => void;
  closeCommentEditor: () => void;
  saveComment: (leafId: string, value: string) => void;
  handleSplitMetadata: (nodeId: string, preserveMetadata: boolean) => void;
  handleJoinMetadata: (childIds: [string, string], parentId: string) => void;
  resetMetadata: () => void;
}

/**
 * Hook for managing subnet metadata (colors, comments).
 * Handles metadata state, cleanup, and split/join propagation.
 */
export function useSubnetMetadata(
  visibleRowIds: Set<string>
): UseSubnetMetadataReturn {
  const [rowColors, setRowColors] = useState<Record<string, string>>({});
  const [rowComments, setRowComments] = useState<Record<string, string>>({});
  const [activeCommentRow, setActiveCommentRow] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  // Clean up metadata for removed leaves
  useEffect(() => {
    setRowColors((current) => cleanupRemovedLeaves(current, visibleRowIds));
    setRowComments((current) => cleanupRemovedLeaves(current, visibleRowIds));

    if (activeCommentRow && !visibleRowIds.has(activeCommentRow)) {
      setActiveCommentRow(null);
      setCommentDraft('');
    }
  }, [visibleRowIds, activeCommentRow]);

  const openCommentEditor = useCallback((leafId: string) => {
    setActiveCommentRow(leafId);
    setCommentDraft(rowComments[leafId] ?? '');
  }, [rowComments]);

  const closeCommentEditor = useCallback(() => {
    setActiveCommentRow(null);
    setCommentDraft('');
  }, []);

  const saveComment = useCallback((leafId: string, value: string) => {
    const trimmed = value.trim();

    setRowComments((current) => {
      if (!trimmed) {
        if (!(leafId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[leafId];
        return next;
      }

      if (current[leafId] === trimmed) {
        return current;
      }

      return {
        ...current,
        [leafId]: trimmed
      };
    });
  }, []);

  const handleSplitMetadata = useCallback((nodeId: string, preserveMetadata: boolean) => {
    if (preserveMetadata) {
      return; // VNet splits preserve metadata
    }

    setRowColors((current) => {
      if (!(nodeId in current)) {
        return current;
      }
      const color = current[nodeId];
      const next = { ...current };
      delete next[nodeId];
      if (color) {
        next[`${nodeId}-0`] = color;
      }
      return next;
    });

    setRowComments((current) => {
      if (!(nodeId in current)) {
        return current;
      }
      const comment = current[nodeId];
      const next = { ...current };
      delete next[nodeId];
      if (comment) {
        next[`${nodeId}-0`] = comment;
      }
      return next;
    });

    if (activeCommentRow === nodeId) {
      closeCommentEditor();
    }
  }, [activeCommentRow, closeCommentEditor]);

  const handleJoinMetadata = useCallback((childIds: [string, string], parentId: string) => {
    setRowColors((current) => mergeChildProperties(current, childIds, parentId, undefined));
    setRowComments((current) => mergeChildProperties(current, childIds, parentId, ''));

    if (activeCommentRow && (childIds.includes(activeCommentRow) || activeCommentRow === parentId)) {
      closeCommentEditor();
    }
  }, [activeCommentRow, closeCommentEditor]);

  const resetMetadata = useCallback(() => {
    setRowColors({});
    setRowComments({});
    setActiveCommentRow(null);
    setCommentDraft('');
  }, []);

  return {
    rowColors,
    setRowColors,
    rowComments,
    setRowComments,
    activeCommentRow,
    commentDraft,
    setCommentDraft,
    openCommentEditor,
    closeCommentEditor,
    saveComment,
    handleSplitMetadata,
    handleJoinMetadata,
    resetMetadata
  };
}
