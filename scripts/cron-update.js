// Scheduled Azure IP Range Update Script
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the project root directory - resolve for GitHub Actions environment
const PROJECT_ROOT = process.env.GITHUB_WORKSPACE || path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');

// Check if the log directory exists, if not create it
const LOG_DIR = path.join(PROJECT_ROOT, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create log file name with timestamp
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(LOG_DIR, `ip-update-${timestamp}.log`);

// Function to log messages to both console and log file
function log(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Function to clean up old log files (keep last 7 days)
function cleanupOldLogs() {
  const logFiles = fs.readdirSync(LOG_DIR);
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

  logFiles.forEach(file => {
    const filePath = path.join(LOG_DIR, file);
    const stats = fs.statSync(filePath);
    if (stats.mtimeMs < sevenDaysAgo) {
      try {
        fs.unlinkSync(filePath);
        log(`Cleaned up old log file: ${file}`);
      } catch (err) {
        log(`Error cleaning up log file ${file}: ${err.message}`);
      }
    }
  });
}

// Function to clean up old backups (keep last 7 days)
function cleanupOldBackups() {
  const backupDir = path.join(DATA_DIR, 'backup');
  if (!fs.existsSync(backupDir)) return;

  const backupFolders = fs.readdirSync(backupDir);
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

  backupFolders.forEach(folder => {
    const folderPath = path.join(backupDir, folder);
    const stats = fs.statSync(folderPath);
    if (stats.mtimeMs < sevenDaysAgo) {
      try {
        fs.rmSync(folderPath, { recursive: true, force: true });
        log(`Cleaned up old backup folder: ${folder}`);
      } catch (err) {
        log(`Error cleaning up backup folder ${folder}: ${err.message}`);
      }
    }
  });
}

// Backup existing data files before update
function backupDataFiles() {
  const backupDir = path.join(DATA_DIR, 'backup', timestamp);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Get all JSON files in data directory
  const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
  
  files.forEach(file => {
    const sourcePath = path.join(DATA_DIR, file);
    const destPath = path.join(backupDir, file);
    
    try {
      fs.copyFileSync(sourcePath, destPath);
      log(`Backed up ${file} to ${backupDir}`);
    } catch (err) {
      log(`Error backing up ${file}: ${err.message}`);
    }
  });
  
  return files.length > 0;
}

// Run the download script
function downloadIpData() {
  return new Promise((resolve, reject) => {
    log('Starting IP data download process using npm run update-ip-data...');
    
    const downloadProcess = exec('npm run update-ip-data', {
      cwd: PROJECT_ROOT
    });
    
    let stdout = '';
    let stderr = '';
    
    downloadProcess.stdout.on('data', (data) => {
      stdout += data;
      log(`[DOWNLOAD] ${data.trim()}`);
    });
    
    downloadProcess.stderr.on('data', (data) => {
      stderr += data;
      log(`[DOWNLOAD ERROR] ${data.trim()}`);
    });
    
    downloadProcess.on('close', (code) => {
      if (code === 0) {
        log('IP data download process completed successfully');
        resolve(true);
      } else {
        log(`IP data download process failed with exit code: ${code}`);
        resolve(false);
      }
    });
    
    downloadProcess.on('error', (err) => {
      log(`Error executing download script: ${err.message}`);
      reject(err);
    });
  });
}

// Validate downloaded files
function validateDataFiles() {
  const requiredFiles = ['AzureCloud.json', 'AzureChinaCloud.json', 'AzureUSGovernment.json'];
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    const dataFilePath = path.join(DATA_DIR, file);
    const publicFilePath = path.join(PUBLIC_DATA_DIR, file);
    
    // Check data directory
    if (!fs.existsSync(dataFilePath)) {
      missingFiles.push(`data/${file}`);
    } else {
      try {
        // Check if file is valid JSON
        const fileContent = fs.readFileSync(dataFilePath, 'utf8');
        JSON.parse(fileContent);
        log(`Validated data/${file} - file is valid JSON`);
      } catch (err) {
        log(`Invalid JSON in data/${file}: ${err.message}`);
        missingFiles.push(`data/${file}`);
      }
    }
    
    // Check public directory
    if (!fs.existsSync(publicFilePath)) {
      missingFiles.push(`public/data/${file}`);
    } else {
      try {
        // Check if file is valid JSON
        const fileContent = fs.readFileSync(publicFilePath, 'utf8');
        JSON.parse(fileContent);
        log(`Validated public/data/${file} - file is valid JSON`);
      } catch (err) {
        log(`Invalid JSON in public/data/${file}: ${err.message}`);
        missingFiles.push(`public/data/${file}`);
      }
    }
  });
  
  if (missingFiles.length > 0) {
    log(`Missing or invalid required files: ${missingFiles.join(', ')}`);
    return false;
  }
  
  return true;
}

// Main function to run the update process
async function main() {
  log('=== Azure IP Range Update Started ===');
  
  try {
    // Clean up old logs and backups first
    cleanupOldLogs();
    cleanupOldBackups();
    
    // Backup existing data
    const backupSuccess = backupDataFiles();
    if (backupSuccess) {
      log('Backup completed successfully');
    } else {
      log('No files to backup or backup failed');
    }
    
    // Download new data
    const downloadSuccess = await downloadIpData();
    if (!downloadSuccess) {
      log('Download failed, aborting update process');
      return;
    }
    
    // Validate data
    const validationSuccess = validateDataFiles();
    if (!validationSuccess) {
      log('Validation failed, data files may be corrupted or missing');
      return;
    }
    
    log('=== Azure IP Range Update Completed Successfully ===');
  } catch (error) {
    log(`Unexpected error during update process: ${error.message}`);
    log(error.stack);
  }
}

// Run the main function
main();
