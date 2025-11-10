import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { AzureCloudName, AzureFileMetadata, AzureServiceTagsRoot } from '../src/types/azure';

interface DownloadMapping {
  id: string;
  cloud: AzureCloudName;
}

// Download mappings for available clouds
const downloadMappings: DownloadMapping[] = [
  { id: '56519', cloud: AzureCloudName.AzureCloud }, // Public
  { id: '57062', cloud: AzureCloudName.AzureChinaCloud }, // China
  { id: '57063', cloud: AzureCloudName.AzureUSGovernment }, // US Government
];

// Directory to save the data files - using single source of truth in public directory
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Metadata file to store file information
const METADATA_FILE = path.join(DATA_DIR, 'file-metadata.json');

const debugEnv = process.env.DEBUG_UPDATE_IP_DATA ?? '';
const DEBUG_UPDATE_LOGS = debugEnv === '1' || debugEnv.toLowerCase() === 'true';

function logDebug(...args: unknown[]): void {
  if (DEBUG_UPDATE_LOGS) {
    console.debug(...args);
  }
}

// Create directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Extract filename from download URL
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    return filename || 'unknown.json';
  } catch (error) {
    console.error('Error extracting filename from URL:', error);
    return 'unknown.json';
  }
}

/**
 * Validates service tag name format
 * Only allows alphanumeric characters, dots, underscores, and hyphens
 * @param tag - Service tag name to validate
 * @returns True if valid, false otherwise
 */
function isValidServiceTagName(tag: string): boolean {
  return typeof tag === 'string' && /^[a-zA-Z0-9._-]+$/.test(tag);
}

/**
 * Validates Azure service tags data for security
 * @param data - Azure service tags data to validate
 * @returns Validated data with invalid tags filtered out
 */
function validateAndSanitizeData(data: AzureServiceTagsRoot): AzureServiceTagsRoot {
  if (!data.values || !Array.isArray(data.values)) {
    console.warn('⚠ Invalid data structure: missing or invalid values array');
    return data;
  }

  const originalCount = data.values.length;
  const validatedValues = data.values.filter(item => {
    if (!item.name) {
      console.warn('⚠ Skipping item without name property');
      return false;
    }

    if (!isValidServiceTagName(item.name)) {
      console.warn(`⚠ SECURITY: Rejecting service tag with invalid characters: "${item.name}"`);
      console.warn(`  Expected format: alphanumeric, dots, underscores, hyphens only`);
      return false;
    }

    return true;
  });

  const rejectedCount = originalCount - validatedValues.length;
  if (rejectedCount > 0) {
    console.warn(`⚠ Rejected ${rejectedCount} service tag(s) with invalid names`);
  }

  return {
    ...data,
    values: validatedValues
  };
}

/**
 * Load existing metadata from file
 */
function loadMetadata(): AzureFileMetadata[] {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const content = fs.readFileSync(METADATA_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading metadata:', error);
  }
  return [];
}

/**
 * Save metadata to file
 */
function saveMetadata(metadata: AzureFileMetadata[]): void {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving metadata:', error);
  }
}

/**
 * Selects the most specific link based on URL length.
 */
function selectMostSpecificLink(links: string[]): string {
  return [...links].sort((a, b) => b.length - a.length)[0];
}

/**
 * Finds the link with the latest date encoded in the filename.
 */
function findLinkWithLatestDate(links: string[]): string | null {
  const dateExtractionRegex = /ServiceTags_(?:Public|China|AzureGovernment)_(\d{8})\.json$/i;

  const linksWithDates = links
    .map(link => {
      const match = dateExtractionRegex.exec(link);
      return match?.[1] ? { link, date: match[1] } : null;
    })
    .filter((item): item is { link: string; date: string } => item !== null);

  if (linksWithDates.length === 0) {
    return null;
  }

  linksWithDates.sort((a, b) => b.date.localeCompare(a.date));
  return linksWithDates[0].link;
}

/**
 * Strategy 1: Extract the download URL from the AcOEt_DownloadUrl JavaScript variable.
 */
function extractFromAcOEtVariable(html: string): string | null {
  const acoetRegex = /var\s+AcOEt_DownloadUrl\s*=\s*"([^"]+\.json)"/i;
  const match = acoetRegex.exec(html);
  return match?.[1]?.replace(/&amp;/g, '&') ?? null;
}

/**
 * Strategy 2: Extract download URLs from href attributes.
 */
function extractFromHrefAttributes(html: string): string | null {
  const linkRegex = /href="([^"]*download\.microsoft\.com\/download\/[^"]+\.json)"/gi;
  const downloadLinks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    downloadLinks.push(match[1].replace(/&amp;/g, '&'));
  }

  if (downloadLinks.length === 0) {
    return null;
  }

  const serviceTagLinks = downloadLinks.filter(link =>
    link.toLowerCase().includes('servicetags')
  );

  if (serviceTagLinks.length > 0) {
    return selectMostSpecificLink(serviceTagLinks);
  }

  return selectMostSpecificLink(downloadLinks);
}

/**
 * Strategy 3: Extract download URLs using a generic matcher with date prioritization.
 */
function extractFromGenericMatches(html: string): string | null {
  const genericJsonLinkRegex = /https:\/\/download\.microsoft\.com\/download\/[^"]+\.json/gi;
  const genericLinks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = genericJsonLinkRegex.exec(html)) !== null) {
    const decodedLink = match[0].replace(/&amp;/g, '&');
    if (!genericLinks.includes(decodedLink)) {
      genericLinks.push(decodedLink);
    }
  }

  if (genericLinks.length === 0) {
    return null;
  }

  const linkWithLatestDate = findLinkWithLatestDate(genericLinks);
  if (linkWithLatestDate) {
    return linkWithLatestDate;
  }

  return selectMostSpecificLink(genericLinks);
}

/**
 * Fetches the HTML content of a URL with browser-like headers.
 */
function fetchHtmlContent(url: string, downloadId: string): Promise<string> {
  const requestOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  };

  return new Promise((resolve, reject) => {
    https.get(url, requestOptions, (res) => {
      let html = '';

      logDebug(`[ID: ${downloadId}] Status Code: ${res.statusCode}`);

      if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302)) {
        if (res.headers.location) {
          logDebug(`[ID: ${downloadId}] Page redirected to: ${res.headers.location}. Note: https.get should follow this.`);
        }
      }

      res.on('data', (chunk) => {
        html += chunk;
      });

      res.on('end', () => {
        logDebug(`[ID: ${downloadId}] HTML content length: ${html.length}`);
        if (html.length < 10000) {
          logDebug(`[ID: ${downloadId}] HTML snippet (first 500 chars): ${html.substring(0, 500)}`);
        }
        resolve(html);
      });

      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Fetches the HTML content of the Microsoft download details page
 * and extracts the direct download URL for the JSON file.
 * @param downloadId The ID of the download (e.g., '56519').
 * @returns A promise that resolves to the download URL string, or null if not found.
 */
async function fetchDownloadUrl(downloadId: string): Promise<string | null> {
  const url = `https://www.microsoft.com/en-us/download/details.aspx?id=${downloadId}`;
  logDebug(`Fetching download page details from: ${url}`);

  try {
    const html = await fetchHtmlContent(url, downloadId);

    const strategies: { name: string; fn: (html: string) => string | null }[] = [
      { name: 'AcOEt variable', fn: extractFromAcOEtVariable },
      { name: 'href attributes', fn: extractFromHrefAttributes },
      { name: 'generic matches', fn: extractFromGenericMatches }
    ];

    for (const strategy of strategies) {
      const result = strategy.fn(html);
      if (result) {
        logDebug(`[ID: ${downloadId}] Found URL via ${strategy.name}: ${result}`);
        return result;
      }
      logDebug(`[ID: ${downloadId}] Strategy '${strategy.name}' found no match`);
    }

    console.error(`[ID: ${downloadId}] Could not extract download URL using any method.`);
    return null;
  } catch (error) {
    console.error(`[ID: ${downloadId}] Error fetching download page:`, error);
    return null;
  }
}

/**
 * Downloads a file from the given URL and saves it to the specified file path.
 * @param url The URL to download the file from.
 * @param filePath The path where the file should be saved.
 * @returns A promise that resolves when the file is downloaded.
 */
async function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.info(`Downloading file from ${url} to ${filePath}`);

    const requestOptions = {
        headers: { // Added User-Agent here too for consistency
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
        }
      };

    https.get(url, requestOptions, (res) => {
      if (res.statusCode !== 200) {
        console.error(`Error downloading ${url}: Status code ${res.statusCode}`);
        res.on('data', () => {});
        res.on('end', () => {
            fs.unlink(filePath, (unlinkErr) => { if (unlinkErr) console.error(`Error deleting partial file ${filePath}: ${unlinkErr.message}`)});
            reject(new Error(`Failed to download file: Status code ${res.statusCode}`));
        });
        return;
      }

      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close((closeErr) => {
            if (closeErr) {
                console.error(`Error closing file stream for ${filePath}:`, closeErr);
                reject(closeErr);
            } else {
                console.info(`Downloaded ${url} to ${filePath}`);
                resolve();
            }
        });
      });

      fileStream.on('error', (streamErr) => {
        fs.unlink(filePath, (unlinkErr) => { if (unlinkErr) console.error(`Error deleting partial file ${filePath}: ${unlinkErr.message}`)});
        console.error(`Error writing file ${filePath}:`, streamErr);
        reject(streamErr);
      });

    }).on('error', (httpErr) => {
      fs.unlink(filePath, (unlinkErr) => { if (unlinkErr) console.error(`Error deleting partial file ${filePath}: ${unlinkErr.message}`)});
      console.error(`Error initiating download for ${url}:`, httpErr);
      reject(httpErr);
    });
  });
}

/**
 * Main function to update all IP data.
 * It iterates through the download mappings, fetches the download URL,
 * and then downloads the respective file.
 */
async function updateAllIpData(): Promise<void> {
  console.info('Starting IP data update...');

  // Load existing metadata
  const metadata = loadMetadata();

  for (const mapping of downloadMappings) {
    console.info(`Processing ${mapping.cloud}...`);

    try {
      const downloadUrl = await fetchDownloadUrl(mapping.id);
      if (!downloadUrl) {
        console.error(`Could not get download URL for ${mapping.cloud} (ID: ${mapping.id}). Skipping.`);
        continue;
      }

      const dataFilePath = path.join(DATA_DIR, `${mapping.cloud}.json`);
      
      // Download directly to public/data directory
      await downloadFile(downloadUrl, dataFilePath);

      // Read the file to get change number
      const fileContent = fs.readFileSync(dataFilePath, 'utf8');
      let data = JSON.parse(fileContent) as AzureServiceTagsRoot;

      // Validate and sanitize the data for security
      console.info(`Validating service tags for ${mapping.cloud}...`);
      data = validateAndSanitizeData(data);

      // Write the validated data back to the file
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
      console.info(`Validated and saved sanitized data for ${mapping.cloud}`);
      
      // Extract filename from download URL
      const filename = extractFilenameFromUrl(downloadUrl);
      
      // Update metadata
      const existingIndex = metadata.findIndex(m => m.cloud === mapping.cloud);
      const fileMetadata: AzureFileMetadata = {
        cloud: mapping.cloud,
        changeNumber: data.changeNumber,
        filename: filename,
        downloadUrl: downloadUrl,
        lastRetrieved: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      };

      if (existingIndex >= 0) {
        metadata[existingIndex] = fileMetadata;
      } else {
        metadata.push(fileMetadata);
      }
      
      console.info(`Successfully updated data for ${mapping.cloud} (${filename}) in public/data/ directory`);

    } catch (error: any) { // Catch specific error type if known, else any
      console.error(`Failed to process ${mapping.cloud} (ID: ${mapping.id}): ${error.message || error}`);
    }
  }

  // Save updated metadata
  saveMetadata(metadata);
  
  console.info('IP data update completed.');
}

// Run the update if the script is executed directly
if (require.main === module) {
  updateAllIpData().catch(error => {
    console.error('Unhandled error during IP data update:', error.message || error);
    process.exit(1);
  });
}

export { updateAllIpData };
export type { AzureCloudName, DownloadMapping };
