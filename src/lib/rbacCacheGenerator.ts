import type { AzureRole, Operation } from '@/types/rbac';
import {
  buildActionsMap,
  collectExplicitActionMetadata,
  collectWildcardPatterns
} from './rbacAggregation';

export interface GenerateActionsCacheOptions {
  verboseLogging?: boolean;
  showProgress?: boolean;
  /** Provider operations to merge into the cache. Actions not already present get roleCount: 0. */
  operations?: Operation[];
}

/**
 * Generates the pre-computed actions cache consumed by the RBAC calculator.
 * Optionally logs progress to aid long-running builds.
 */
export function generateActionsCache(
  roles: AzureRole[],
  options: GenerateActionsCacheOptions = {}
): Array<{ name: string; roleCount: number }> {
  const { verboseLogging = false, showProgress = false, operations } = options;
  const log = (...args: unknown[]): void => {
    if (verboseLogging) {
      console.log(...args);
    }
  };

  log('Generating pre-computed actions cache...');

  const { actionCasingMap, explicitActionRoles } = collectExplicitActionMetadata(roles);
  log(`  Found ${actionCasingMap.size} unique actions across ${roles.length} roles`);

  const wildcardPatterns = collectWildcardPatterns(roles);
  log(`  Found ${wildcardPatterns.length} wildcard patterns`);

  const actionsMap = buildActionsMap(actionCasingMap, explicitActionRoles, wildcardPatterns);

  // Merge provider operations that aren't already in the map (e.g. actions only reachable via wildcards)
  if (operations && operations.length > 0) {
    let mergedCount = 0;
    for (const op of operations) {
      const key = op.name.toLowerCase();
      if (!actionsMap.has(key)) {
        actionsMap.set(key, { name: op.name, roleCount: 0 });
        mergedCount++;
      }
    }
    log(`  Merged ${mergedCount} additional actions from provider operations`);
  }

  const totalActions = actionsMap.size;
  let processedActions = 0;

  // The map key is only ever value.name.toLowerCase(), so it is not written out;
  // consumers that need a lookup key derive it on load.
  const actionsCache = Array.from(actionsMap.values()).map((value) => {
    processedActions += 1;
    if (showProgress && processedActions % 1000 === 0) {
      console.log(`  Processing actions: ${processedActions}/${totalActions}...`);
    }

    return { name: value.name, roleCount: value.roleCount };
  });

  log(`✓ Generated cache with ${actionsCache.length} unique actions`);
  return actionsCache;
}
