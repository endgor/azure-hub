/**
 * Computes the difference between two versions of Azure IP data
 */

import type { AzureServiceTagsRoot, AzureCloudName } from '../src/types/azure';
import type { IpDiffFile, AddedTag, RemovedTag, ModifiedTag, CloudVersionInfo } from '../src/types/ipDiff';

export interface ComputeDiffOptions {
  previousData: AzureServiceTagsRoot;
  currentData: AzureServiceTagsRoot;
  previousFilename: string;
  currentFilename: string;
  cloud?: AzureCloudName;
}

/**
 * Computes the diff between two versions of Azure IP data
 */
export function computeIpDiff(options: ComputeDiffOptions): IpDiffFile {
  const { previousData, currentData, previousFilename, currentFilename, cloud } = options;

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
        ...(cloud && { cloud }),
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
            ...(cloud && { cloud }),
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
        ...(cloud && { cloud }),
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

  const cloudVersionInfo = cloud ? {
    clouds: {
      [cloud]: {
        fromChangeNumber: previousData.changeNumber,
        toChangeNumber: currentData.changeNumber,
        fromFilename: previousFilename,
        toFilename: currentFilename,
      }
    }
  } : {};

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
      ...cloudVersionInfo,
    },
    addedTags,
    removedTags,
    modifiedTags,
  };
}

/**
 * Merges multiple diff files from different clouds into a single combined diff
 */
export function mergeDiffs(diffs: IpDiffFile[]): IpDiffFile {
  if (diffs.length === 0) {
    return {
      meta: {
        generatedAt: new Date().toISOString(),
        summary: {
          serviceTagsAdded: 0,
          serviceTagsRemoved: 0,
          serviceTagsModified: 0,
          totalPrefixesAdded: 0,
          totalPrefixesRemoved: 0,
        },
        clouds: {},
      },
      addedTags: [],
      removedTags: [],
      modifiedTags: [],
    };
  }

  if (diffs.length === 1) {
    return diffs[0];
  }

  // Merge all tags
  const allAddedTags: AddedTag[] = [];
  const allRemovedTags: RemovedTag[] = [];
  const allModifiedTags: ModifiedTag[] = [];
  const clouds: Partial<Record<AzureCloudName, CloudVersionInfo>> = {};

  for (const diff of diffs) {
    allAddedTags.push(...diff.addedTags);
    allRemovedTags.push(...diff.removedTags);
    allModifiedTags.push(...diff.modifiedTags);

    // Merge cloud version info
    if (diff.meta.clouds) {
      Object.assign(clouds, diff.meta.clouds);
    }
  }

  // Sort all tags
  allAddedTags.sort((a, b) => {
    const cloudCmp = (a.cloud || '').localeCompare(b.cloud || '');
    return cloudCmp !== 0 ? cloudCmp : a.name.localeCompare(b.name);
  });
  allRemovedTags.sort((a, b) => {
    const cloudCmp = (a.cloud || '').localeCompare(b.cloud || '');
    return cloudCmp !== 0 ? cloudCmp : a.name.localeCompare(b.name);
  });
  allModifiedTags.sort((a, b) => {
    const cloudCmp = (a.cloud || '').localeCompare(b.cloud || '');
    return cloudCmp !== 0 ? cloudCmp : a.name.localeCompare(b.name);
  });

  // Compute combined summary
  const totalPrefixesAdded =
    allAddedTags.reduce((sum, t) => sum + t.prefixCount, 0) +
    allModifiedTags.reduce((sum, t) => sum + t.addedPrefixes.length, 0);

  const totalPrefixesRemoved =
    allRemovedTags.reduce((sum, t) => sum + t.prefixCount, 0) +
    allModifiedTags.reduce((sum, t) => sum + t.removedPrefixes.length, 0);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      summary: {
        serviceTagsAdded: allAddedTags.length,
        serviceTagsRemoved: allRemovedTags.length,
        serviceTagsModified: allModifiedTags.length,
        totalPrefixesAdded,
        totalPrefixesRemoved,
      },
      clouds,
    },
    addedTags: allAddedTags,
    removedTags: allRemovedTags,
    modifiedTags: allModifiedTags,
  };
}
