import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
// Assuming AzureCloudName is defined in this path, e.g.:
// export enum AzureCloudName {
//   AzureCloud = 'AzureCloud',
//   AzureChinaCloud = 'AzureChinaCloud',
//   AzureUSGovernment = 'AzureUSGovernment',
// }
import { AzureCloudName } from '../src/types/azure'; // Adjust path as necessary

interface DownloadMapping {
  id: string;
  cloud: AzureCloudName;
}

// Updated download mappings, removing AzureGermanCloud
const downloadMappings: DownloadMapping[] = [
  { id: '56519', cloud: AzureCloudName.AzureCloud }, // Public
  { id: '57062', cloud: AzureCloudName.AzureChinaCloud }, // China
  { id: '57063', cloud: AzureCloudName.AzureUSGovernment }, // US Government
];

// Directory to save the data files
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
      // console.log(`[ID: ${downloadId}] Response Headers: ${JSON.stringify(res.headers, null, 2)}`); // Uncomment for detailed header logging

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
                // Prefer longer, more specific URLs if multiple are found
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

  for (const mapping of downloadMappings) {
    console.log(`Processing ${mapping.cloud}...`);

    try {
      const downloadUrl = await fetchDownloadUrl(mapping.id);
      if (!downloadUrl) {
        console.error(`Could not get download URL for ${mapping.cloud} (ID: ${mapping.id}). Skipping.`);
        continue;
      }

      const filePath = path.join(DATA_DIR, `${mapping.cloud}.json`);
      await downloadFile(downloadUrl, filePath);
      console.log(`Successfully updated data for ${mapping.cloud}`);

    } catch (error: any) { // Catch specific error type if known, else any
      console.error(`Failed to process ${mapping.cloud} (ID: ${mapping.id}): ${error.message || error}`);
    }
  }
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