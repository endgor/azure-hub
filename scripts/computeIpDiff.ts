/**
 * Computes the difference between two versions of Azure IP data
 */

import type { AzureServiceTagsRoot } from '../src/types/azure';
import type { IpDiffFile, AddedTag, RemovedTag, ModifiedTag } from '../src/types/ipDiff';

export interface ComputeDiffOptions {
  previousData: AzureServiceTagsRoot;
  currentData: AzureServiceTagsRoot;
  previousFilename: string;
  currentFilename: string;
}

/**
 * Computes the diff between two versions of Azure IP data
 */
export function computeIpDiff(options: ComputeDiffOptions): IpDiffFile {
  const { previousData, currentData, previousFilename, currentFilename } = options;

  // Build maps for efficient lookup
  const previousTagsMap = new Map(
    previousData.values.map((tag) => [tag.name, tag])
  );
  const currentTagsMap = new Map(
    currentData.values.map((tag) => [tag.name, tag])
  );

  const addedTags: AddedTag[] = [];
  const removedTags: RemovedTag[] = [];
  const modifiedTags: ModifiedTag[] = [];

  // Find added and modified tags
  for (const [name, currentTag] of currentTagsMap) {
    const previousTag = previousTagsMap.get(name);

    if (!previousTag) {
      // Tag is completely new
      const prefixes = currentTag.properties.addressPrefixes || [];
      addedTags.push({
        name: currentTag.name,
        systemService: currentTag.properties.systemService || '',
        region: currentTag.properties.region || '',
        prefixCount: prefixes.length,
        prefixes: prefixes,
      });
    } else {
      // Check if tag was modified (changeNumber changed)
      if (
        previousTag.properties.changeNumber !== currentTag.properties.changeNumber
      ) {
        const previousPrefixes = new Set(
          previousTag.properties.addressPrefixes || []
        );
        const currentPrefixes = new Set(
          currentTag.properties.addressPrefixes || []
        );

        const addedPrefixes = [...currentPrefixes].filter(
          (p) => !previousPrefixes.has(p)
        );
        const removedPrefixes = [...previousPrefixes].filter(
          (p) => !currentPrefixes.has(p)
        );

        // Only include if there are actual prefix changes
        if (addedPrefixes.length > 0 || removedPrefixes.length > 0) {
          modifiedTags.push({
            name: currentTag.name,
            systemService: currentTag.properties.systemService || '',
            region: currentTag.properties.region || '',
            previousChangeNumber: previousTag.properties.changeNumber || 0,
            currentChangeNumber: currentTag.properties.changeNumber || 0,
            addedPrefixes,
            removedPrefixes,
          });
        }
      }
    }
  }

  // Find removed tags
  for (const [name, previousTag] of previousTagsMap) {
    if (!currentTagsMap.has(name)) {
      const prefixes = previousTag.properties.addressPrefixes || [];
      removedTags.push({
        name: previousTag.name,
        systemService: previousTag.properties.systemService || '',
        region: previousTag.properties.region || '',
        prefixCount: prefixes.length,
        prefixes: prefixes,
      });
    }
  }

  // Sort for consistent output
  addedTags.sort((a, b) => a.name.localeCompare(b.name));
  removedTags.sort((a, b) => a.name.localeCompare(b.name));
  modifiedTags.sort((a, b) => a.name.localeCompare(b.name));

  // Compute summary
  const totalPrefixesAdded =
    addedTags.reduce((sum, t) => sum + t.prefixCount, 0) +
    modifiedTags.reduce((sum, t) => sum + t.addedPrefixes.length, 0);

  const totalPrefixesRemoved =
    removedTags.reduce((sum, t) => sum + t.prefixCount, 0) +
    modifiedTags.reduce((sum, t) => sum + t.removedPrefixes.length, 0);

  return {
    meta: {
      fromChangeNumber: previousData.changeNumber,
      toChangeNumber: currentData.changeNumber,
      fromFilename: previousFilename,
      toFilename: currentFilename,
      generatedAt: new Date().toISOString(),
      summary: {
        serviceTagsAdded: addedTags.length,
        serviceTagsRemoved: removedTags.length,
        serviceTagsModified: modifiedTags.length,
        totalPrefixesAdded,
        totalPrefixesRemoved,
      },
    },
    addedTags,
    removedTags,
    modifiedTags,
  };
}
