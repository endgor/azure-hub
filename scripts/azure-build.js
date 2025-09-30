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
  
  // Check if we have required data files
  const requiredFiles = ['AzureCloud.json', 'AzureChinaCloud.json', 'AzureUSGovernment.json', 'file-metadata.json'];
  const missingFiles = requiredFiles.filter(file => !jsonFiles.includes(file));

  if (missingFiles.length > 0) {
    console.error(`ERROR: Missing required data files: ${missingFiles.join(', ')}`);
    console.error('Please run "npm run update-ip-data" to download the latest Azure IP ranges.');
    process.exit(1);
  }
  
  // No file copying needed since data files are already in public/data directory
  console.log(`Found ${jsonFiles.length} existing JSON files in public/data directory`);
  
  console.log('Build script completed successfully.');
} catch (err) {
  console.error('Error in build script:', err);
}
