import * as fs from 'fs';
import * as path from 'path';

// Type definitions
interface RolePermission {
  actions: string[];
  notActions: string[];
  dataActions?: string[];
  notDataActions?: string[];
}

interface AzureRole {
  id: string;
  name: string;
  type: string;
  description: string;
  roleName: string;
  roleType: 'BuiltInRole' | 'CustomRole';
  permissions: RolePermission[];
  assignableScopes: string[];
  permissionCount?: number;
  dataActions?: string[];
  notDataActions?: string[];
}

// File paths
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const ROLES_FILE = path.join(DATA_DIR, 'roles-extended.json');
const ACTIONS_CACHE_FILE = path.join(DATA_DIR, 'actions-cache.json');

/**
 * Check if a permission action matches a wildcard pattern
 * (Replicated from rbacService.ts for build-time generation)
 */
function matchesWildcard(pattern: string, action: string): boolean {
  if (!pattern || !action) return false;

  const normalizedPattern = pattern.toLowerCase();
  const normalizedAction = action.toLowerCase();

  if (normalizedPattern === normalizedAction) return true;
  if (normalizedPattern === '*') return true;

  const regexPattern = normalizedPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedAction);
}

/**
 * Generate pre-computed actions cache from existing roles file
 */
function generateActionsCache(roles: AzureRole[]): Array<{ key: string; name: string; roleCount: number }> {
  console.log('Generating pre-computed actions cache...');

  // First pass: Collect explicit actions, track casing variants and which roles have them
  const explicitActionRoles = new Map<string, Set<number>>();
  const actionCasingMap = new Map<string, Map<string, number>>();

  for (let roleIndex = 0; roleIndex < roles.length; roleIndex++) {
    const role = roles[roleIndex];
    for (const permission of role.permissions) {
      // Process regular actions
      for (const action of permission.actions) {
        if (!action.includes('*')) {
          const lowerAction = action.toLowerCase();

          if (!actionCasingMap.has(lowerAction)) {
            actionCasingMap.set(lowerAction, new Map());
          }
          const casingVariants = actionCasingMap.get(lowerAction)!;
          casingVariants.set(action, (casingVariants.get(action) || 0) + 1);

          if (!explicitActionRoles.has(lowerAction)) {
            explicitActionRoles.set(lowerAction, new Set());
          }
          explicitActionRoles.get(lowerAction)!.add(roleIndex);
        }
      }

      // Process data actions
      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          if (!dataAction.includes('*')) {
            const lowerAction = dataAction.toLowerCase();

            if (!actionCasingMap.has(lowerAction)) {
              actionCasingMap.set(lowerAction, new Map());
            }
            const casingVariants = actionCasingMap.get(lowerAction)!;
            casingVariants.set(dataAction, (casingVariants.get(dataAction) || 0) + 1);

            if (!explicitActionRoles.has(lowerAction)) {
              explicitActionRoles.set(lowerAction, new Set());
            }
            explicitActionRoles.get(lowerAction)!.add(roleIndex);
          }
        }
      }
    }
  }

  console.log(`  Found ${actionCasingMap.size} unique actions across ${roles.length} roles`);

  // Second pass: Collect all wildcard patterns from roles
  const wildcardPatterns: Array<{ pattern: string; roleIndex: number; notActions: string[] }> = [];

  for (let roleIndex = 0; roleIndex < roles.length; roleIndex++) {
    const role = roles[roleIndex];
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (action.includes('*')) {
          wildcardPatterns.push({
            pattern: action,
            roleIndex,
            notActions: permission.notActions
          });
        }
      }
    }
  }

  console.log(`  Found ${wildcardPatterns.length} wildcard patterns`);

  // Third pass: For each action, count roles (explicit + wildcard matches)
  const actionsCache: Array<{ key: string; name: string; roleCount: number }> = [];
  let processedActions = 0;
  const totalActions = actionCasingMap.size;

  for (const [lowerAction, casingVariants] of Array.from(actionCasingMap.entries())) {
    processedActions++;

    // Show progress every 1000 actions
    if (processedActions % 1000 === 0) {
      console.log(`  Processing actions: ${processedActions}/${totalActions}...`);
    }

    // Choose canonical casing (most commonly used variant)
    let canonicalName = '';
    let maxCount = 0;

    for (const [casing, count] of Array.from(casingVariants.entries())) {
      if (count > maxCount) {
        maxCount = count;
        canonicalName = casing;
      }
    }

    // Start with explicit role indices
    const roleSet = new Set(explicitActionRoles.get(lowerAction) || []);

    // Add roles that grant via wildcards
    for (const { pattern, roleIndex, notActions } of wildcardPatterns) {
      if (matchesWildcard(pattern, canonicalName)) {
        // Check if it's not denied
        let isDenied = false;
        for (const deniedAction of notActions) {
          if (matchesWildcard(deniedAction, canonicalName)) {
            isDenied = true;
            break;
          }
        }

        if (!isDenied) {
          roleSet.add(roleIndex);
        }
      }
    }

    actionsCache.push({
      key: lowerAction,
      name: canonicalName,
      roleCount: roleSet.size
    });
  }

  console.log(`✓ Generated cache with ${actionsCache.length} unique actions`);
  return actionsCache;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('Starting actions cache generation...\n');

  // Check if roles file exists
  if (!fs.existsSync(ROLES_FILE)) {
    console.error(`ERROR: Roles file not found: ${ROLES_FILE}`);
    console.error('Please run: npm run update-rbac-data');
    process.exit(1);
  }

  try {
    // Load roles from file
    console.log(`Reading roles from ${ROLES_FILE}...`);
    const rolesData = fs.readFileSync(ROLES_FILE, 'utf8');
    const roles = JSON.parse(rolesData) as AzureRole[];
    console.log(`✓ Loaded ${roles.length} roles\n`);

    // Generate actions cache
    const startTime = Date.now();
    const actionsCache = generateActionsCache(roles);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Save to file
    console.log(`\nWriting ${actionsCache.length} actions to ${ACTIONS_CACHE_FILE}...`);
    fs.writeFileSync(ACTIONS_CACHE_FILE, JSON.stringify(actionsCache, null, 2), 'utf8');
    console.log(`✓ Actions cache saved\n`);

    console.log(`Actions cache generation completed in ${elapsedTime}s!`);
    console.log('\nGenerated file:');
    console.log(`  - ${ACTIONS_CACHE_FILE}`);
    console.log('\nThis file will be loaded by the RBAC calculator to avoid expensive runtime computation.');

  } catch (error: any) {
    console.error('\nFailed to generate actions cache:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error during actions cache generation:', error.message || error);
    process.exit(1);
  });
}

export { generateActionsCache };
