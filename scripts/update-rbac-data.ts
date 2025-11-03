import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { calculatePermissionCount } from '../src/lib/rbacUtils';

// Type definitions (inline to avoid import issues with ts-node)
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

interface Operation {
  name: string;
  displayName: string;
  description: string;
  origin?: string;
  provider: string;
}

// Directory to save the data files
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Output file paths
const ROLES_FILE = path.join(DATA_DIR, 'roles-extended.json');
const PERMISSIONS_FILE = path.join(DATA_DIR, 'permissions.json');

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
 * Fetch all resource provider operations
 * This provides the full list of available Azure permissions
 */
function fetchResourceProviderOperations(): Operation[] {
  console.info('Fetching resource provider operations...');

  try {
    const output = execSync('az provider operation show --namespace * --output json', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const operations = JSON.parse(output) as Operation[];
    console.info(`Fetched ${operations.length} operations`);
    return operations;
  } catch (error: any) {
    // If the wildcard doesn't work, fall back to fetching all known providers
    console.warn('Wildcard fetch failed, attempting to fetch individual providers...');
    return fetchOperationsByProvider();
  }
}

/**
 * Fetch operations by iterating through common resource providers
 */
function fetchOperationsByProvider(): Operation[] {
  const allOperations: Operation[] = [];

  // Common Azure resource providers
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

      const operations = JSON.parse(output) as Operation[];
      allOperations.push(...operations);
      logDebug(`  Fetched ${operations.length} operations`);
    } catch (error: any) {
      console.warn(`  Warning: Failed to fetch operations for ${provider}`);
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

    // Fetch and save operations (permissions)
    let operations: Operation[] = [];
    try {
      operations = fetchResourceProviderOperations();
      const transformedOperations = transformOperations(operations);

      console.info(`Writing ${transformedOperations.length} operations to ${PERMISSIONS_FILE}...`);
      fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(transformedOperations, null, 2), 'utf8');
      console.info(`✓ Permissions data saved\n`);
    } catch (error: any) {
      console.warn('Warning: Could not fetch operations. The calculator will still work with role data only.');
      console.warn('You can manually create an empty permissions file:');
      console.warn(`  echo '[]' > ${PERMISSIONS_FILE}`);
    }

    console.info('RBAC data update completed successfully!');
    console.info('\nGenerated files:');
    console.info(`  - ${ROLES_FILE}`);
    if (operations.length > 0) {
      console.info(`  - ${PERMISSIONS_FILE}`);
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
