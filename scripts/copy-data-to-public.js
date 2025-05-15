const fs = require('fs');
const path = require('path');

// Paths
const dataDir = path.join(process.cwd(), 'data');
const publicDataDir = path.join(process.cwd(), 'public', 'data');

// Create public data directory if it doesn't exist
if (!fs.existsSync(publicDataDir)) {
  console.log('Creating public/data directory');
  fs.mkdirSync(publicDataDir, { recursive: true });
}

// Get all JSON files in the data directory
try {
  const files = fs.readdirSync(dataDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    console.log('No JSON files found in the data directory');
  } else {
    console.log(`Found ${jsonFiles.length} JSON files to copy`);
    
    // Copy each JSON file to the public data directory
    jsonFiles.forEach(file => {
      const srcPath = path.join(dataDir, file);
      const destPath = path.join(publicDataDir, file);
      
      try {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file} to public/data/`);
      } catch (err) {
        console.error(`Error copying ${file}:`, err);
      }
    });
  }
} catch (err) {
  console.error('Error reading data directory:', err);
}
