import type { AzureRole } from '@/types/rbac';
import {
  buildActionsMap,
  collectExplicitActionMetadata,
  collectWildcardPatterns
} from './rbacAggregation';

export interface GenerateActionsCacheOptions {
  verboseLogging?: boolean;
  showProgress?: boolean;
}

/**
 * Generates the pre-computed actions cache shared by build scripts and runtime fallbacks.
 * Optionally logs progress to aid long-running builds.
 */
export function generateActionsCache(
  roles: AzureRole[],
  options: GenerateActionsCacheOptions = {}
): Array<{ key: string; name: string; roleCount: number }> {
  const { verboseLogging = false, showProgress = false } = options;
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

  const totalActions = actionsMap.size;
  let processedActions = 0;

  const actionsCache = Array.from(actionsMap.entries()).map(([key, value]) => {
    processedActions += 1;
    if (showProgress && processedActions % 1000 === 0) {
      console.log(`  Processing actions: ${processedActions}/${totalActions}...`);
    }

    return { key, name: value.name, roleCount: value.roleCount };
  });

  log(`✓ Generated cache with ${actionsCache.length} unique actions`);
  return actionsCache;
}
