import * as fs from 'fs';
import * as path from 'path';
import type { AzureRole } from '../src/types/rbac';
import { generateActionsCache } from '../src/lib/rbacCacheGenerator';

// File paths
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const ROLES_FILE = path.join(DATA_DIR, 'roles-extended.json');
const ACTIONS_INDEX_FILE = path.join(DATA_DIR, 'actions-index.json');

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
    const actionsCache = generateActionsCache(roles, {
      verboseLogging: true,
      showProgress: true
    });
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Save to file
    console.log(`\nWriting ${actionsCache.length} actions to ${ACTIONS_INDEX_FILE}...`);
    fs.writeFileSync(ACTIONS_INDEX_FILE, JSON.stringify(actionsCache, null, 2), 'utf8');
    console.log(`✓ Actions cache saved\n`);

    console.log(`Actions cache generation completed in ${elapsedTime}s!`);
    console.log('\nGenerated file:');
    console.log(`  - ${ACTIONS_INDEX_FILE}`);
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
