import * as fs from 'fs';
import * as path from 'path';
import { ClientSecretCredential, DefaultAzureCredential, type TokenCredential } from '@azure/identity';
import { calculatePermissionCount } from '../src/lib/rbacUtils';
import { generateActionsCache } from '../src/lib/rbacCacheGenerator';
import type { AzureRole, Operation, EntraIDRole } from '../src/types/rbac';

// Directory to save the data files
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Output file paths
const ROLES_FILE = path.join(DATA_DIR, 'roles-extended.json');
const ACTIONS_INDEX_FILE = path.join(DATA_DIR, 'actions-index.json');
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

const ARM_BASE_URL = process.env.ARM_BASE_URL ?? 'https://management.azure.com';
const ARM_SCOPE = process.env.ARM_SCOPE ?? 'https://management.azure.com/.default';
const GRAPH_BASE_URL = process.env.GRAPH_BASE_URL ?? 'https://graph.microsoft.com';
const GRAPH_SCOPE = process.env.GRAPH_SCOPE ?? 'https://graph.microsoft.com/.default';
const API_VERSION = '2022-04-01';

let cachedCredential: TokenCredential | undefined;
const tokenCache = new Map<string, { token: string; expiresOn: number }>();

/** Service principal in CI; anything DefaultAzureCredential finds (including `az login`) locally. */
function getCredential(): TokenCredential {
  if (cachedCredential) return cachedCredential;

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  cachedCredential =
    tenantId && clientId && clientSecret
      ? new ClientSecretCredential(tenantId, clientId, clientSecret, {
          authorityHost: process.env.AZURE_AUTHORITY_HOST,
        })
      : new DefaultAzureCredential();

  return cachedCredential;
}

async function getToken(scope: string): Promise<string> {
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresOn > Date.now() + 60_000) return cached.token;

  const token = await getCredential().getToken(scope);
  if (!token) {
    throw new Error(
      `Could not acquire a token for ${scope}. Set AZURE_TENANT_ID, AZURE_CLIENT_ID and ` +
        'AZURE_CLIENT_SECRET, or run `az login`.'
    );
  }

  tokenCache.set(scope, { token: token.token, expiresOn: token.expiresOnTimestamp });
  return token.token;
}

function getSubscriptionId(): string {
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    throw new Error(
      'AZURE_SUBSCRIPTION_ID is not set. Role definition ids embed the subscription, so it has to ' +
        'match the one already in roles-extended.json.'
    );
  }
  return subscriptionId;
}

async function restGet<T>(url: string, scope: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${await getToken(scope)}`, Accept: 'application/json' },
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`GET ${url.split('?')[0]} returned ${res.status}: ${body.slice(0, 300)}`);
  }
  return JSON.parse(body) as T;
}

/** Follows ARM `nextLink` and Graph `@odata.nextLink` to the last page. */
async function fetchAllPages<T>(url: string, scope: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = url;

  while (next) {
    const page: { value?: T[]; nextLink?: string; '@odata.nextLink'?: string } = await restGet(next, scope);
    items.push(...(page.value ?? []));
    next = page.nextLink ?? page['@odata.nextLink'];
  }

  return items;
}

type ArmPermission = {
  actions?: string[];
  notActions?: string[];
  dataActions?: string[];
  notDataActions?: string[];
  condition?: string | null;
  conditionVersion?: string | null;
};

type ArmRoleDefinition = {
  id: string;
  name: string;
  type: string;
  properties?: {
    roleName?: string;
    description?: string;
    type?: string;
    assignableScopes?: string[];
    permissions?: ArmPermission[];
    createdOn?: string;
    updatedOn?: string;
    createdBy?: string | null;
    updatedBy?: string | null;
  };
};

/** The CLI-shaped record that roles-extended.json has always held: properties.* flattened onto
 *  the role, plus audit fields the AzureRole type does not model. */
type CliRoleRecord = AzureRole & {
  createdBy: string | null;
  createdOn: string | null;
  systemData: null;
  updatedBy: string | null;
  updatedOn: string | null;
};

/** ARM sends `2018-10-29T17:52:32.5201170Z`; the CLI wrote Python's isoformat,
 *  `2018-10-29T17:52:32.520117+00:00`, which drops a zero fraction entirely. */
export function toCliTimestamp(value?: string | null): string | null {
  if (!value) return null;

  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(?:Z|[+-]\d{2}:?\d{2})?$/);
  if (!match) return value;

  const micros = (match[2] ?? '').slice(0, 6).padEnd(6, '0');
  return micros === '000000' ? `${match[1]}+00:00` : `${match[1]}.${micros}+00:00`;
}

/** Key order matches the CLI output so moving to REST does not rewrite all 945 records. */
export function toCliRoleRecord(item: ArmRoleDefinition): CliRoleRecord {
  const properties = item.properties ?? {};

  return {
    assignableScopes: properties.assignableScopes ?? [],
    createdBy: properties.createdBy ?? null,
    createdOn: toCliTimestamp(properties.createdOn),
    description: properties.description ?? '',
    id: item.id,
    name: item.name,
    permissions: (properties.permissions ?? []).map((permission) => ({
      actions: permission.actions ?? [],
      condition: permission.condition ?? null,
      conditionVersion: permission.conditionVersion ?? null,
      dataActions: permission.dataActions ?? [],
      notActions: permission.notActions ?? [],
      notDataActions: permission.notDataActions ?? [],
    })),
    roleName: properties.roleName ?? '',
    roleType: (properties.type ?? '') as AzureRole['roleType'],
    systemData: null,
    type: item.type,
    updatedBy: properties.updatedBy ?? null,
    updatedOn: toCliTimestamp(properties.updatedOn),
  };
}

/**
 * Fetch all Azure role definitions from ARM at subscription scope.
 * Subscription scope is what keeps the role `id`s identical to the committed file.
 */
async function fetchRoleDefinitions(): Promise<AzureRole[]> {
  console.info('Fetching Azure role definitions...');

  const url = `${ARM_BASE_URL}/subscriptions/${getSubscriptionId()}/providers/Microsoft.Authorization/roleDefinitions?api-version=${API_VERSION}`;
  const items = await fetchAllPages<ArmRoleDefinition>(url, ARM_SCOPE);
  const roles = items.map(toCliRoleRecord);

  console.info(`Fetched ${roles.length} role definitions`);
  return roles;
}

/**
 * Extract a flat list of operations from one ProviderOperationsMetadata entry, which carries
 * `operations` and `resourceTypes[].operations` at the top level rather than under `properties`.
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
 * `$expand=resourceTypes` returns every provider's operations in one paged call.
 */
async function fetchResourceProviderOperations(): Promise<Operation[]> {
  console.info('Fetching resource provider operations...');

  const url = `${ARM_BASE_URL}/providers/Microsoft.Authorization/providerOperations?api-version=${API_VERSION}&$expand=resourceTypes`;

  try {
    const providers = await fetchAllPages<Record<string, unknown>>(url, ARM_SCOPE);
    const allOps: Operation[] = [];
    for (const provider of providers) {
      allOps.push(...flattenProviderOperations(provider));
    }
    console.info(`Fetched ${allOps.length} operations from ${providers.length} providers`);
    return allOps;
  } catch (error: unknown) {
    console.warn('Provider operations list failed, falling back to individual providers...');
    logDebug('  Error:', error instanceof Error ? error.message : error);
    return fetchOperationsByProvider();
  }
}

/**
 * Fetch operations by iterating through common resource providers
 */
async function fetchOperationsByProvider(): Promise<Operation[]> {
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
      const providerData = await restGet<Record<string, unknown>>(
        `${ARM_BASE_URL}/providers/Microsoft.Authorization/providerOperations/${provider}?api-version=${API_VERSION}&$expand=resourceTypes`,
        ARM_SCOPE
      );

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
 * Fetch Entra ID role definitions from Microsoft Graph.
 * Needs the RoleManagement.Read.Directory application permission.
 */
async function fetchEntraIDRoles(): Promise<EntraIDRole[]> {
  console.info('Fetching Entra ID role definitions...');

  try {
    const roles = await fetchAllPages<EntraIDRole>(
      `${GRAPH_BASE_URL}/v1.0/roleManagement/directory/roleDefinitions`,
      GRAPH_SCOPE
    );
    console.info(`Fetched ${roles.length} Entra ID role definitions`);
    return roles;
  } catch (error: unknown) {
    console.error('Failed to fetch Entra ID roles:', error instanceof Error ? error.message : error);
    console.error('Note: Make sure the identity can read directory roles.');
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

  try {
    const roles = await fetchRoleDefinitions();

    // Filter to built-in roles only to avoid leaking tenant-specific custom roles
    const builtInRoles = roles.filter(role => role.roleType === 'BuiltInRole');
    console.info(`Filtered to ${builtInRoles.length} built-in roles (excluded ${roles.length - builtInRoles.length} custom roles)`);

    // Extend role data with computed fields
    const extendedRoles = extendRoleData(builtInRoles);

    // Save roles to file
    console.info(`Writing ${extendedRoles.length} roles to ${ROLES_FILE}...`);
    fs.writeFileSync(ROLES_FILE, JSON.stringify(extendedRoles, null, 2), 'utf8');
    console.info(`✓ Roles data saved\n`);

    // Fetch provider operations (used to enrich the actions cache)
    let operations: Operation[] = [];
    try {
      operations = await fetchResourceProviderOperations();
      operations = transformOperations(operations);
    } catch (error: any) {
      console.warn('Warning: Could not fetch provider operations. The cache will still work with role data only.');
    }

    // Generate and save pre-computed actions cache (enriched with provider operations)
    const actionsCache = generateActionsCache(extendedRoles, {
      verboseLogging: false,
      operations,
    });
    console.info(`Writing ${actionsCache.length} actions to ${ACTIONS_INDEX_FILE}...`);
    fs.writeFileSync(ACTIONS_INDEX_FILE, JSON.stringify(actionsCache), 'utf8');
    console.info(`✓ Actions cache saved\n`);

    // Fetch and save Entra ID roles
    let entraIdRolesSuccess = false;
    try {
      const entraIdRoles = await fetchEntraIDRoles();
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
    console.info(`  - ${ACTIONS_INDEX_FILE}`);
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
