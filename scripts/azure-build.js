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
  
  // Check if we have any data files
  if (jsonFiles.length === 0) {
    console.log('No JSON files found in data directory. Creating empty placeholders.');
    
    // Create empty placeholder files for the 3 Azure clouds
    const clouds = ['AzureCloud', 'AzureChinaCloud', 'AzureUSGovernment'];
    
    clouds.forEach(cloud => {
      const placeholderPath = path.join(DATA_DIR, `${cloud}.json`);
      const placeholderContent = JSON.stringify({
        name: cloud,
        id: '',
        changeNumber: 0,
        cloud: cloud,
        values: []
      });
      
      try {
        fs.writeFileSync(placeholderPath, placeholderContent);
        console.log(`Created empty placeholder for ${cloud}`);
      } catch (writeErr) {
        console.error(`Error creating placeholder for ${cloud}:`, writeErr);
      }
    });
    
    // Refresh the list of files
    const updatedFiles = fs.readdirSync(DATA_DIR);
    const updatedJsonFiles = updatedFiles.filter(file => file.endsWith('.json'));
    console.log(`Now have ${updatedJsonFiles.length} JSON files in data directory`);
  }
  
  // No file copying needed since data files are already in public/data directory
  const existingFiles = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
  console.log(`Found ${existingFiles.length} existing JSON files in public/data directory`);
  
  console.log('Build script completed successfully.');
} catch (err) {
  console.error('Error in build script:', err);
}
