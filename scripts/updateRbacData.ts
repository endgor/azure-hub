import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { calculatePermissionCount } from '../src/lib/rbacUtils';
import { generateActionsCache } from '../src/lib/rbacCacheGenerator';
import type { AzureRole, Operation, EntraIDRole } from '../src/types/rbac';

// Directory to save the data files
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Output file paths
const ROLES_FILE = path.join(DATA_DIR, 'roles-extended.json');
const ACTIONS_CACHE_FILE = path.join(DATA_DIR, 'actions-cache.json');
const ENTRAID_ROLES_FILE = path.join(DATA_DIR, 'entraid-roles.json');

const debugEnv = process.env.DEBUG_UPDATE_RBAC_DATA ?? '';
const DEBUG_LOGS = debugEnv === '1' || debugEnv.toLowerCase() === 'true';

function logDebug(...args: unknown[]): void {
  if (DEBUG_LOGS) {
    console.debug(...args);
  }
}

// Create directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Check if Azure CLI is installed and logged in
 */
function checkAzureCli(): boolean {
  try {
    execSync('az --version', { stdio: 'ignore' });
    logDebug('Azure CLI is installed');
    return true;
  } catch (error) {
    console.error('ERROR: Azure CLI is not installed or not in PATH');
    console.error('Please install Azure CLI from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli');
    return false;
  }
}

/**
 * Check if logged into Azure
 */
function checkAzureLogin(): boolean {
  try {
    execSync('az account show', { stdio: 'ignore' });
    logDebug('Logged into Azure');
    return true;
  } catch (error) {
    console.error('ERROR: Not logged into Azure');
    console.error('Please run: az login');
    return false;
  }
}

/**
 * Fetch all Azure role definitions using Azure CLI
 */
function fetchRoleDefinitions(): AzureRole[] {
  console.info('Fetching Azure role definitions...');

  try {
    const output = execSync('az role definition list --output json', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large output
    });

    const roles = JSON.parse(output) as AzureRole[];
    console.info(`Fetched ${roles.length} role definitions`);
    return roles;
  } catch (error: any) {
    console.error('Failed to fetch role definitions:', error.message);
    throw error;
  }
}

/**
 * Extract a flat list of operations from the nested `az provider operation show` response.
 * The response is a single object with top-level `operations` and `resourceTypes[].operations`.
 */
function flattenProviderOperations(providerData: Record<string, unknown>): Operation[] {
  const ops: Operation[] = [];
  const namespace = (providerData.name as string) ?? '';

  // Top-level operations (e.g. register/unregister)
  const topOps = providerData.operations as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(topOps)) {
    for (const op of topOps) {
      if (op.name) {
        ops.push({
          name: op.name as string,
          displayName: (op.displayName as string) ?? '',
          description: (op.description as string) ?? '',
          origin: (op.origin as string) ?? undefined,
          provider: namespace,
        });
      }
    }
  }

  // Operations nested under resourceTypes
  const resourceTypes = providerData.resourceTypes as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(resourceTypes)) {
    for (const rt of resourceTypes) {
      const rtOps = rt.operations as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(rtOps)) {
        for (const op of rtOps) {
          if (op.name) {
            ops.push({
              name: op.name as string,
              displayName: (op.displayName as string) ?? '',
              description: (op.description as string) ?? '',
              origin: (op.origin as string) ?? undefined,
              provider: namespace,
            });
          }
        }
      }
    }
  }

  return ops;
}

/**
 * Fetch all resource provider operations.
 * Uses `az provider operation list` to get all providers at once.
 */
function fetchResourceProviderOperations(): Operation[] {
  console.info('Fetching resource provider operations...');

  try {
    const output = execSync('az provider operation list --output json', {
      encoding: 'utf8',
      maxBuffer: 100 * 1024 * 1024 // 100MB buffer — full list is large
    });

    const providers = JSON.parse(output) as Array<Record<string, unknown>>;
    const allOps: Operation[] = [];
    for (const provider of providers) {
      allOps.push(...flattenProviderOperations(provider));
    }
    console.info(`Fetched ${allOps.length} operations from ${providers.length} providers`);
    return allOps;
  } catch (error: unknown) {
    console.warn('az provider operation list failed, falling back to individual providers...');
    logDebug('  Error:', error instanceof Error ? error.message : error);
    return fetchOperationsByProvider();
  }
}

/**
 * Fetch operations by iterating through common resource providers
 */
function fetchOperationsByProvider(): Operation[] {
  const allOperations: Operation[] = [];

  // Common Azure resource providers — hardcoded list as fallback
  const providers = [
    'Microsoft.Compute',
    'Microsoft.Storage',
    'Microsoft.Network',
    'Microsoft.Web',
    'Microsoft.Sql',
    'Microsoft.KeyVault',
    'Microsoft.Authorization',
    'Microsoft.Resources',
    'Microsoft.AAD',
    'Microsoft.Insights',
    'Microsoft.OperationalInsights',
    'Microsoft.ContainerService',
    'Microsoft.ServiceBus',
    'Microsoft.EventHub',
    'Microsoft.Devices',
    'Microsoft.DocumentDB',
    'Microsoft.Cache',
    'Microsoft.CognitiveServices',
    'Microsoft.MachineLearningServices',
    'Microsoft.Security',
    'Microsoft.ManagedIdentity'
  ];

  for (const provider of providers) {
    try {
      logDebug(`Fetching operations for ${provider}...`);
      const output = execSync(`az provider operation show --namespace ${provider} --output json`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });

      const providerData = JSON.parse(output) as Record<string, unknown>;
      const ops = flattenProviderOperations(providerData);
      allOperations.push(...ops);
      logDebug(`  Fetched ${ops.length} operations`);
    } catch (error: unknown) {
      console.warn(`  Warning: Failed to fetch operations for ${provider}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.info(`Total operations fetched: ${allOperations.length}`);
  return allOperations;
}

/**
 * Extend role data with computed fields
 * Adds permissionCount and flattened action lists
 */
function extendRoleData(roles: AzureRole[]): AzureRole[] {
  console.info('Computing permission counts and extending role data...');

  return roles.map(role => {
    // Calculate permission count for least privilege ranking
    const permissionCount = calculatePermissionCount(role);

    // Flatten all data actions for easier searching
    const dataActions = new Set<string>();
    const notDataActions = new Set<string>();

    for (const permission of role.permissions) {
      if (permission.dataActions) {
        permission.dataActions.forEach(action => dataActions.add(action));
      }
      if (permission.notDataActions) {
        permission.notDataActions.forEach(action => notDataActions.add(action));
      }
    }

    return {
      ...role,
      permissionCount,
      dataActions: Array.from(dataActions),
      notDataActions: Array.from(notDataActions)
    };
  });
}

/**
 * Transform operations into a more search-friendly format
 */
function transformOperations(operations: Operation[]): Operation[] {
  console.info('Transforming operations data...');

  // Deduplicate operations by name
  const uniqueOperations = new Map<string, Operation>();

  for (const operation of operations) {
    if (!uniqueOperations.has(operation.name)) {
      // Extract provider namespace from operation name
      const provider = operation.name.split('/')[0];

      uniqueOperations.set(operation.name, {
        ...operation,
        provider
      });
    }
  }

  return Array.from(uniqueOperations.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Fetch Entra ID role definitions using Microsoft Graph API via Azure CLI
 */
function fetchEntraIDRoles(): EntraIDRole[] {
  console.info('Fetching Entra ID role definitions...');

  try {
    const output = execSync(
      'az rest --method GET --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions"',
      {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      }
    );

    const response = JSON.parse(output);
    const roles = response.value as EntraIDRole[];
    console.info(`Fetched ${roles.length} Entra ID role definitions`);
    return roles;
  } catch (error: any) {
    console.error('Failed to fetch Entra ID roles:', error.message);
    console.error('Note: Make sure you have permissions to read directory roles.');
    throw error;
  }
}

/**
 * Calculate permission count for Entra ID roles
 */
function calculateEntraIDPermissionCount(role: EntraIDRole): number {
  let count = 0;

  for (const permission of role.rolePermissions) {
    for (const action of permission.allowedResourceActions) {
      if (action === '*') {
        count += 10000;
      } else if (action.includes('*')) {
        const segments = action.split('/').filter(s => s === '*').length;
        count += 100 * segments;
      } else {
        count += 1;
      }
    }

    // Subtract for excluded actions
    if (permission.excludedResourceActions) {
      for (const excluded of permission.excludedResourceActions) {
        if (excluded === '*') {
          count -= 1000;
        } else if (excluded.includes('*')) {
          count -= 10;
        } else {
          count -= 1;
        }
      }
    }
  }

  return Math.max(count, 1);
}

/**
 * Extend Entra ID role data with computed fields
 */
function extendEntraIDRoleData(roles: EntraIDRole[]): EntraIDRole[] {
  console.info('Processing Entra ID role data...');

  return roles.map(role => ({
    ...role,
    permissionCount: calculateEntraIDPermissionCount(role)
  }));
}

/**
 * Main function to update RBAC data
 */
async function updateRbacData(): Promise<void> {
  console.info('Starting RBAC data update...\n');

  // Check prerequisites
  if (!checkAzureCli()) {
    process.exit(1);
  }

  if (!checkAzureLogin()) {
    process.exit(1);
  }

  try {
    // Fetch role definitions
    const roles = fetchRoleDefinitions();

    // Extend role data with computed fields
    const extendedRoles = extendRoleData(roles);

    // Save roles to file
    console.info(`Writing ${extendedRoles.length} roles to ${ROLES_FILE}...`);
    fs.writeFileSync(ROLES_FILE, JSON.stringify(extendedRoles, null, 2), 'utf8');
    console.info(`✓ Roles data saved\n`);

    // Fetch provider operations (used to enrich the actions cache)
    let operations: Operation[] = [];
    try {
      operations = fetchResourceProviderOperations();
      operations = transformOperations(operations);
    } catch (error: any) {
      console.warn('Warning: Could not fetch provider operations. The cache will still work with role data only.');
    }

    // Generate and save pre-computed actions cache (enriched with provider operations)
    const actionsCache = generateActionsCache(extendedRoles, {
      verboseLogging: false,
      operations,
    });
    console.info(`Writing ${actionsCache.length} actions to ${ACTIONS_CACHE_FILE}...`);
    fs.writeFileSync(ACTIONS_CACHE_FILE, JSON.stringify(actionsCache, null, 2), 'utf8');
    console.info(`✓ Actions cache saved\n`);

    // Fetch and save Entra ID roles
    let entraIdRolesSuccess = false;
    try {
      const entraIdRoles = fetchEntraIDRoles();
      const extendedEntraIdRoles = extendEntraIDRoleData(entraIdRoles);

      console.info(`Writing ${extendedEntraIdRoles.length} Entra ID roles to ${ENTRAID_ROLES_FILE}...`);
      fs.writeFileSync(ENTRAID_ROLES_FILE, JSON.stringify(extendedEntraIdRoles, null, 2), 'utf8');
      console.info(`✓ Entra ID roles data saved\n`);
      entraIdRolesSuccess = true;
    } catch (error: any) {
      console.warn('Warning: Could not fetch Entra ID roles. The calculator will work with Azure RBAC only.');
      console.warn('Error:', error.message);
      console.warn('You can manually create an empty file:');
      console.warn(`  echo '[]' > ${ENTRAID_ROLES_FILE}`);
    }

    console.info('RBAC data update completed successfully!');
    console.info('\nGenerated files:');
    console.info(`  - ${ROLES_FILE}`);
    console.info(`  - ${ACTIONS_CACHE_FILE}`);
    if (entraIdRolesSuccess) {
      console.info(`  - ${ENTRAID_ROLES_FILE}`);
    }

  } catch (error: any) {
    console.error('\nFailed to update RBAC data:', error.message);
    process.exit(1);
  }
}

// Run the update if the script is executed directly
if (require.main === module) {
  updateRbacData().catch(error => {
    console.error('Unhandled error during RBAC data update:', error.message || error);
    process.exit(1);
  });
}

export { updateRbacData };
