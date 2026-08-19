// This script runs during build to ensure IP data files are available
const fs = require('fs');
const path = require('path');

console.log('Running build script for Azure IP lookup data...');

// Define path - using single source of truth in public directory
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  console.log('Public/data directory not found! Creating empty one.');
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// List all files in the data directory
try {
  const files = fs.readdirSync(DATA_DIR);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} JSON files in data directory`);
  
  // Check if we have required IP data files
  const requiredIpFiles = ['AzureCloud.json', 'AzureChinaCloud.json', 'AzureUSGovernment.json', 'file-metadata.json'];
  const missingIpFiles = requiredIpFiles.filter(file => !jsonFiles.includes(file));

  if (missingIpFiles.length > 0) {
    console.error(`ERROR: Missing required IP data files: ${missingIpFiles.join(', ')}`);
    console.error('Please run "npm run update-ip-data" to download the latest Azure IP ranges.');
    process.exit(1);
  }

  // Check if we have required RBAC data files
  const requiredRbacFiles = ['roles-extended.json'];
  const missingRbacFiles = requiredRbacFiles.filter(file => !jsonFiles.includes(file));

  if (missingRbacFiles.length > 0) {
    console.error(`ERROR: Missing required RBAC data files: ${missingRbacFiles.join(', ')}`);
    console.error('Please run "npm run update-rbac-data" to fetch Azure role definitions.');
    console.error('Note: You need to be logged in to Azure CLI (run "az login" first).');
    process.exit(1);
  }
  
  // Check if we have required Private DNS zone data files
  const requiredDnsFiles = ['private-dns-zones.json'];
  const missingDnsFiles = requiredDnsFiles.filter(file => !jsonFiles.includes(file));

  if (missingDnsFiles.length > 0) {
    console.error(`ERROR: Missing required Private DNS zone data files: ${missingDnsFiles.join(', ')}`);
    console.error('Please run "npm run update-private-dns-zones" to fetch Private Endpoint DNS zone data.');
    process.exit(1);
  }

  // Check if we have required VM pricing data files
  const VM_PRICING_DIR = path.join(DATA_DIR, 'vm-pricing');
  const requiredVmFiles = ['index.json', 'skus.json'];
  const missingVmFiles = requiredVmFiles.filter(
    file => !fs.existsSync(path.join(VM_PRICING_DIR, file))
  );

  if (missingVmFiles.length > 0) {
    console.error(`ERROR: Missing required VM pricing data files: ${missingVmFiles.join(', ')}`);
    console.error('Please run "npm run update-vm-pricing" and then "npm run update-vm-specs".');
    process.exit(1);
  }

  const vmIndex = JSON.parse(fs.readFileSync(path.join(VM_PRICING_DIR, 'index.json'), 'utf8'));
  const missingRegionFiles = vmIndex.regions
    .filter(region => !fs.existsSync(path.join(VM_PRICING_DIR, 'prices', `${region.name}.json`)))
    .map(region => region.name);

  if (missingRegionFiles.length > 0) {
    console.error(`ERROR: VM pricing index lists ${missingRegionFiles.length} region files that do not exist:`);
    console.error(`  ${missingRegionFiles.slice(0, 10).join(', ')}`);
    console.error('Please run "npm run update-vm-pricing" to regenerate them.');
    process.exit(1);
  }

  // Prices are stored in one base currency; everything else is a rate applied in the browser.
  const baseRate = (vmIndex.currencies || []).find(entry => entry.code === vmIndex.baseCurrency);
  if (!baseRate || baseRate.rate !== 1) {
    console.error(`ERROR: VM pricing index is missing a 1.0 rate for its base currency ${vmIndex.baseCurrency}.`);
    process.exit(1);
  }

  console.log(
    `VM pricing data OK: ${vmIndex.regions.length} regions in ${vmIndex.baseCurrency}, ${vmIndex.currencies.length} currencies`
  );

  console.log('Build script completed successfully.');
} catch (err) {
  console.error('Error in build script:', err);
  process.exit(1);
}
