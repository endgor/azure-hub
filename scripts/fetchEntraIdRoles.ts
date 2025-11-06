import * as fs from 'fs';
import * as path from 'path';
import { ClientSecretCredential } from '@azure/identity';

/**
 * Fetches Entra ID role definitions from Microsoft Graph API
 * Uses the same app registration credentials as tenant lookup
 *
 * Required API Permission: RoleManagement.Read.Directory (application)
 */

interface EntraIDRolePermission {
  allowedResourceActions: string[];
  excludedResourceActions?: string[];
  condition?: string;
}

interface EntraIDRole {
  id: string;
  displayName: string;
  description: string;
  isBuiltIn: boolean;
  isEnabled: boolean;
  templateId: string;
  version?: string;
  rolePermissions: EntraIDRolePermission[];
  permissionCount?: number;
}

interface GraphResponse {
  value: EntraIDRole[];
}

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const ENTRAID_ROLES_FILE = path.join(DATA_DIR, 'entraid-roles.json');

const GRAPH_SCOPE = process.env.GRAPH_SCOPE ?? 'https://graph.microsoft.com/.default';
const GRAPH_BASE_URL = process.env.GRAPH_BASE_URL ?? 'https://graph.microsoft.com';

function getEnvValue(...keys: string[]): string | undefined {
  return keys.map(key => process.env[key]).find(value => value);
}

function getCredential() {
  const tenantId = getEnvValue('AZURE_TENANT_ID', 'GRAPH_TENANT_ID');
  const clientId = getEnvValue('AZURE_CLIENT_ID', 'GRAPH_CLIENT_ID');
  const clientSecret = getEnvValue('AZURE_CLIENT_SECRET', 'GRAPH_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Missing credentials. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID (or GRAPH_* equivalents).'
    );
  }

  return new ClientSecretCredential(tenantId, clientId, clientSecret, {
    authorityHost: process.env.AZURE_AUTHORITY_HOST,
  });
}

/**
 * Calculate permission count for Entra ID roles
 */
function calculatePermissionCount(role: EntraIDRole): number {
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

async function fetchEntraIDRoles(): Promise<EntraIDRole[]> {
  console.info('Fetching Entra ID role definitions from Microsoft Graph...');

  try {
    const credential = getCredential();
    const token = await credential.getToken(GRAPH_SCOPE);

    if (!token) {
      throw new Error('Failed to acquire Microsoft Graph access token.');
    }

    const graphUrl = `${GRAPH_BASE_URL}/v1.0/roleManagement/directory/roleDefinitions`;
    console.info(`Request: GET ${graphUrl}`);

    const response = await fetch(graphUrl, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Graph API error (${response.status}): ${errorText}`);
      throw new Error(`Microsoft Graph API request failed with status ${response.status}`);
    }

    const data = await response.json() as GraphResponse;
    const roles = data.value;

    console.info(`✓ Fetched ${roles.length} Entra ID role definitions`);
    return roles;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to fetch Entra ID roles:', error.message);

      if (error.message.includes('credentials')) {
        console.error('\nMake sure you have set the following environment variables:');
        console.error('  - AZURE_CLIENT_ID (or GRAPH_CLIENT_ID)');
        console.error('  - AZURE_CLIENT_SECRET (or GRAPH_CLIENT_SECRET)');
        console.error('  - AZURE_TENANT_ID (or GRAPH_TENANT_ID)');
      } else if (error.message.includes('401') || error.message.includes('403')) {
        console.error('\nYour app registration needs the following API permission:');
        console.error('  - Microsoft Graph: RoleManagement.Read.Directory (Application)');
        console.error('\nTo add this permission:');
        console.error('  1. Go to Azure Portal > App Registrations > Your App');
        console.error('  2. Click "API permissions" > "Add a permission"');
        console.error('  3. Select "Microsoft Graph" > "Application permissions"');
        console.error('  4. Search for "RoleManagement.Read.Directory" and add it');
        console.error('  5. Click "Grant admin consent" for your tenant');
      }
    }
    throw error;
  }
}

function extendEntraIDRoleData(roles: EntraIDRole[]): EntraIDRole[] {
  console.info('Processing Entra ID role data and calculating permission counts...');

  return roles.map(role => ({
    ...role,
    permissionCount: calculatePermissionCount(role)
  }));
}

async function main() {
  console.info('Starting Entra ID roles data fetch...\n');

  // Create directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  try {
    // Fetch roles from Microsoft Graph
    const roles = await fetchEntraIDRoles();

    if (roles.length === 0) {
      console.warn('Warning: No roles returned from Microsoft Graph API');
      return;
    }

    // Extend with computed fields
    const extendedRoles = extendEntraIDRoleData(roles);

    // Save to file
    console.info(`\nWriting ${extendedRoles.length} Entra ID roles to ${ENTRAID_ROLES_FILE}...`);
    fs.writeFileSync(ENTRAID_ROLES_FILE, JSON.stringify(extendedRoles, null, 2), 'utf8');
    console.info('✓ Entra ID roles data saved successfully!\n');

    // Show some stats
    const builtInCount = extendedRoles.filter(r => r.isBuiltIn).length;
    const customCount = extendedRoles.filter(r => !r.isBuiltIn).length;
    const enabledCount = extendedRoles.filter(r => r.isEnabled).length;

    console.info('Summary:');
    console.info(`  Total roles: ${extendedRoles.length}`);
    console.info(`  Built-in roles: ${builtInCount}`);
    console.info(`  Custom roles: ${customCount}`);
    console.info(`  Enabled roles: ${enabledCount}`);
    console.info(`\nFile saved: ${ENTRAID_ROLES_FILE}`);
  } catch (error) {
    console.error('\n❌ Failed to fetch Entra ID roles');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error.message || error);
    process.exit(1);
  });
}

export { main as fetchEntraIDRoles };
