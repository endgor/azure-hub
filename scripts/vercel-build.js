// This script runs during Vercel build to ensure IP data files are available
const fs = require('fs');
const path = require('path');

console.log('Running Vercel build script for Azure IP lookup data...');

// Define paths - use consistent naming with other scripts
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');

// Ensure both directories exist
if (!fs.existsSync(DATA_DIR)) {
  console.log('Data directory not found! Creating empty one.');
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(PUBLIC_DATA_DIR)) {
  console.log('Creating public/data directory');
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
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
  
  // Copy all JSON files from data directory to public/data
  const filesToCopy = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
  
  filesToCopy.forEach(file => {
    const srcPath = path.join(DATA_DIR, file);
    const destPath = path.join(PUBLIC_DATA_DIR, file);
    
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
