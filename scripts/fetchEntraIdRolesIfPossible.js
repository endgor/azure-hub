/**
 * Optional build-time fetch of Entra ID roles
 * Only runs if Azure credentials are available (e.g., in Vercel deployments)
 * Fails gracefully if credentials are missing (e.g., local dev)
 */

const { execSync } = require('child_process');

function getEnvValue(...keys) {
  return keys.map(key => process.env[key]).find(value => value);
}

function hasCredentials() {
  const tenantId = getEnvValue('AZURE_TENANT_ID', 'GRAPH_TENANT_ID');
  const clientId = getEnvValue('AZURE_CLIENT_ID', 'GRAPH_CLIENT_ID');
  const clientSecret = getEnvValue('AZURE_CLIENT_SECRET', 'GRAPH_CLIENT_SECRET');

  return !!(tenantId && clientId && clientSecret);
}

function main() {
  console.log('Checking for Entra ID role fetch credentials...');

  if (!hasCredentials()) {
    console.log('⚠️  Azure credentials not found - skipping Entra ID roles fetch');
    console.log('   (This is normal for local development)');
    console.log('   Run "npm run fetch-entraid-roles" manually if needed');
    process.exit(0);
  }

  console.log('✓ Azure credentials found - fetching Entra ID roles...');

  try {
    execSync('npm run fetch-entraid-roles', {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    console.log('✓ Entra ID roles fetched successfully');
  } catch (error) {
    console.error('⚠️  Failed to fetch Entra ID roles:', error.message);
    console.error('   Build will continue, but Entra ID features may not work');
    // Don't fail the build - just log the warning
    process.exit(0);
  }
}

main();
