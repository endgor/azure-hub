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
  
  // No file copying needed since data files are already in public/data directory
  console.log(`Found ${jsonFiles.length} existing JSON files in public/data directory`);
  
  console.log('Build script completed successfully.');
} catch (err) {
  console.error('Error in build script:', err);
}
