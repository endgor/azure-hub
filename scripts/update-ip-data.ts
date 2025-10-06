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
 * Fetches the HTML content of the Microsoft download details page
 * and extracts the direct download URL for the JSON file.
 * @param downloadId The ID of the download (e.g., '56519').
 * @returns A promise that resolves to the download URL string, or null if not found.
 */
async function fetchDownloadUrl(downloadId: string): Promise<string | null> {
  const url = `https://www.microsoft.com/en-us/download/details.aspx?id=${downloadId}`;
  console.log(`Fetching download page details from: ${url}`);

  // Enhanced request headers to mimic a browser
  const requestOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
      // It might be necessary to handle cookies if a consent banner blocks content.
      // 'Cookie': 'OptanonConsent=isIABGlobal=false&datestamp=Fri+May+17+2024+10%3A00%3A00+GMT%2B0200+(Central+European+Summer+Time)&version=6.17.0&hosts=&consentId=...&interactionCount=1&landingPath=NotLandingPage&groups=C0001%3A1%2CSTACK42%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false', // Example cookie
    }
  };

  return new Promise((resolve) => {
    https.get(url, requestOptions, (res) => {
      let html = '';

      console.log(`[ID: ${downloadId}] Status Code: ${res.statusCode}`);

      // Handle potential redirects (though https.get usually handles them)
      if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302)) {
        if (res.headers.location) {
          console.log(`[ID: ${downloadId}] Page redirected to: ${res.headers.location}. Note: https.get should follow this.`);
        }
      }

      res.on('data', (chunk) => {
        html += chunk;
      });

      res.on('end', () => {
        console.log(`[ID: ${downloadId}] HTML content length: ${html.length}`);
        if (html.length < 10000) { // Arbitrary small length to log snippet for debugging
            console.log(`[ID: ${downloadId}] HTML snippet (first 500 chars): ${html.substring(0, 500)}`);
        }

        let extractedUrl: string | null = null;

        // 1. Primary Method: Try to extract from AcOEt_DownloadUrl JavaScript variable
        const acoetRegex = /var\s+AcOEt_DownloadUrl\s*=\s*"([^"]+\.json)"/i;
        const acoetMatch = acoetRegex.exec(html);
        if (acoetMatch && acoetMatch[1]) {
          extractedUrl = acoetMatch[1].replace(/&amp;/g, '&');
          console.log(`[ID: ${downloadId}] Found download URL via AcOEt_DownloadUrl: ${extractedUrl}`);
          resolve(extractedUrl);
          return;
        } else {
          console.log(`[ID: ${downloadId}] AcOEt_DownloadUrl not found.`);
        }

        // 2. Fallback Method: Regex to find download links in href attributes
        const linkRegex = /href="([^"]*download\.microsoft\.com\/download\/[^"]+\.json)"/gi;
        const downloadLinks: string[] = [];
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          const decodedLink = match[1].replace(/&amp;/g, '&');
          downloadLinks.push(decodedLink);
        }
        console.log(`[ID: ${downloadId}] Found ${downloadLinks.length} potential JSON download links via href attributes.`);

        if (downloadLinks.length > 0) {
          const serviceTagLinks = downloadLinks.filter(link =>
            link.toLowerCase().includes('servicetags')
          );

          if (serviceTagLinks.length > 0) {
            const mostSpecificLink = serviceTagLinks.sort((a, b) => b.length - a.length)[0];
            console.log(`[ID: ${downloadId}] Using ServiceTags link from href: ${mostSpecificLink}`);
            resolve(mostSpecificLink);
            return;
          }

          const sortedJsonLinks = downloadLinks.sort((a, b) => b.length - a.length);
          console.log(`[ID: ${downloadId}] No specific 'ServiceTags' link in href. Using first available JSON link: ${sortedJsonLinks[0]}`);
          resolve(sortedJsonLinks[0]);
          return;
        }
        
        // 3. Generic Fallback (less reliable)
        if (!extractedUrl) {
            const genericJsonLinkRegex = /https:\/\/download\.microsoft\.com\/download\/[^"]+\.json/gi;
            let genericMatch;
            const genericLinks : string[] = [];
            while((genericMatch = genericJsonLinkRegex.exec(html)) !== null) {
                const decodedLink = genericMatch[0].replace(/&amp;/g, '&');
                if (!genericLinks.includes(decodedLink)) {
                    genericLinks.push(decodedLink);
                }
            }

            if (genericLinks.length > 0) {
                console.log(`[ID: ${downloadId}] Found ${genericLinks.length} potential JSON download links using generic regex.`);

                // Attempt to find links with YYYYMMDD dates in the filename
                // e.g., ServiceTags_Public_20230101.json, ServiceTags_China_20230101.json
                const dateExtractionRegex = /ServiceTags_(?:Public|China|AzureGovernment)_(\d{8})\.json$/i;
                
                const linksWithDates = genericLinks
                    .map(link => {
                        const match = dateExtractionRegex.exec(link);
                        if (match && match[1]) {
                            return { link, date: match[1] }; // date is YYYYMMDD
                        }
                        return null;
                    })
                    .filter(item => item !== null) as { link: string; date: string }[];

                if (linksWithDates.length > 0) {
                    // Sort by date descending (most recent first)
                    linksWithDates.sort((a, b) => b.date.localeCompare(a.date));
                    const latestLinkByDate = linksWithDates[0].link;
                    console.log(`[ID: ${downloadId}] Prioritizing latest dated ServiceTags link from generic matches: ${latestLinkByDate}`);
                    resolve(latestLinkByDate);
                    return;
                } else {
                     console.log(`[ID: ${downloadId}] No ServiceTags with parseable dates (YYYYMMDD) found in generic links.`);
                }

                // Original fallback: Prefer longer, more specific URLs if multiple are found and no dates were parsed
                console.log(`[ID: ${downloadId}] Falling back to sorting generic links by length.`);
                const sortedGenericLinks = genericLinks.sort((a,b) => b.length - a.length);
                resolve(sortedGenericLinks[0]);
                return;
            }
        }

        console.error(`[ID: ${downloadId}] Could not extract download URL using any method.`);
        // For deeper debugging, you could save the full HTML:
        // fs.writeFileSync(path.join(DATA_DIR, `debug_page_${downloadId}.html`), html, 'utf-8');
        // console.log(`[ID: ${downloadId}] Full HTML saved to debug_page_${downloadId}.html`);
        resolve(null);
      });
    }).on('error', (err) => {
      console.error(`[ID: ${downloadId}] Error fetching download page:`, err);
      resolve(null);
    });
  });
}

/**
 * Downloads a file from the given URL and saves it to the specified file path.
 * @param url The URL to download the file from.
 * @param filePath The path where the file should be saved.
 * @returns A promise that resolves when the file is downloaded.
 */
async function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Downloading file from ${url} to ${filePath}`);

    const requestOptions = {
        headers: { // Added User-Agent here too for consistency
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
        }
      };

    https.get(url, requestOptions, (res) => {
      if (res.statusCode !== 200) {
        console.error(`Error downloading ${url}: Status code ${res.statusCode}`);
        // Attempt to read response body for more error details
        let errorBody = '';
        res.on('data', chunk => errorBody += chunk);
        res.on('end', () => {
            console.error(`Error response body: ${errorBody.substring(0, 500)}`); // Log first 500 chars of error
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
                console.log(`Downloaded ${url} to ${filePath}`);
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
  console.log('Starting IP data update...');

  // Load existing metadata
  const metadata = loadMetadata();

  for (const mapping of downloadMappings) {
    console.log(`Processing ${mapping.cloud}...`);

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
      console.log(`Validating service tags for ${mapping.cloud}...`);
      data = validateAndSanitizeData(data);

      // Write the validated data back to the file
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Validated and saved sanitized data for ${mapping.cloud}`);
      
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
      
      console.log(`Successfully updated data for ${mapping.cloud} (${filename}) in public/data/ directory`);

    } catch (error: any) { // Catch specific error type if known, else any
      console.error(`Failed to process ${mapping.cloud} (ID: ${mapping.id}): ${error.message || error}`);
    }
  }

  // Save updated metadata
  saveMetadata(metadata);
  
  console.log('IP data update completed.');
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