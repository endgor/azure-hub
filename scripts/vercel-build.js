// This script runs during Vercel build to ensure IP data files are available
const fs = require('fs');
const path = require('path');

console.log('Running Vercel build script for Azure IP lookup data...');

// Define paths
const dataDir = path.join(process.cwd(), 'data');
const publicDataDir = path.join(process.cwd(), 'public', 'data');

// Ensure public data directory exists
if (!fs.existsSync(publicDataDir)) {
  console.log('Creating public/data directory');
  fs.mkdirSync(publicDataDir, { recursive: true });
}

// Check if data directory exists
if (!fs.existsSync(dataDir)) {
  console.log('Data directory not found! Creating empty one.');
  fs.mkdirSync(dataDir, { recursive: true });
}

// List all files in the data directory
try {
  const files = fs.readdirSync(dataDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} JSON files in data directory`);
  
  // Check if we have any data files
  if (jsonFiles.length === 0) {
    console.log('No JSON files found in data directory. Creating empty placeholders.');
    
    // Create empty placeholder files for the 3 Azure clouds
    const clouds = ['AzureCloud', 'AzureChinaCloud', 'AzureUSGovernment'];
    
    clouds.forEach(cloud => {
      const placeholderPath = path.join(dataDir, `${cloud}.json`);
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
    const updatedFiles = fs.readdirSync(dataDir);
    const updatedJsonFiles = updatedFiles.filter(file => file.endsWith('.json'));
    console.log(`Now have ${updatedJsonFiles.length} JSON files in data directory`);
  }
  
  // Copy all JSON files from data directory to public/data
  const filesToCopy = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
  
  filesToCopy.forEach(file => {
    const srcPath = path.join(dataDir, file);
    const destPath = path.join(publicDataDir, file);
    
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${file} to public/data/`);
    } catch (err) {
      console.error(`Error copying ${file}:`, err);
    }
  });
  
  console.log('Vercel build script completed successfully.');
} catch (err) {
  console.error('Error in Vercel build script:', err);
}
