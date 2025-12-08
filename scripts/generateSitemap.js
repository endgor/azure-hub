// Generate sitemap.xml for static export
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const BASE_URL = 'https://azurehub.org';
const OUTPUT_DIR = path.join(process.cwd(), 'public');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides');

/**
 * Most commonly used Azure service tags that should be included in sitemap
 * Focuses on core services, popular PaaS offerings, and frequently searched tags
 */
const POPULAR_SERVICE_TAGS = [
  // Core Infrastructure
  'AzureCloud',
  'Storage',
  'Sql',
  'AzureLoadBalancer',
  'AzureTrafficManager',
  'AzureFrontDoor',

  // Compute & Containers
  'AppService',
  'AzureContainerRegistry',
  'AzureKubernetesService',
  'BatchNodeManagement',

  // Identity & Security
  'AzureActiveDirectory',
  'AzureKeyVault',
  'AzureSecurityCenter',
  'AzureInformationProtection',

  // Data Services
  'AzureCosmosDB',
  'AzureDataLake',
  'DataFactory',
  'EventHub',
  'ServiceBus',
  'AzureEventGrid',

  // Monitoring & Management
  'AzureMonitor',
  'AzureBackup',
  'AzureSiteRecovery',
  'LogicApps',
  'AzureAutomation',

  // Analytics & AI
  'HDInsight',
  'PowerBI',
  'AzureMachineLearning',
  'CognitiveServicesManagement',
  'AzureDatabricks',

  // Integration
  'AzureApiManagement',
  'ServiceFabric',
  'AzureSignalR',
  'AzureIoTHub',
  'AzureDevOps',

  // Business Apps
  'Dynamics365',
  'PowerQueryOnline',
  'MicrosoftDefenderForEndpoint',

  // Regional variants for major regions (US, EU, Asia)
  'Storage.EastUS',
  'Storage.WestEurope',
  'Storage.SoutheastAsia',
  'Sql.EastUS',
  'Sql.WestEurope',
  'AppService.EastUS',
  'AppService.WestEurope'
];

/**
 * Checks if a service tag should be included in the sitemap
 * @param {string} tag - Service tag name
 * @returns {boolean} True if tag should be included
 */
function shouldIncludeServiceTag(tag) {
  // Include if it's in the popular list
  if (POPULAR_SERVICE_TAGS.includes(tag)) {
    return true;
  }

  // Include base service tags (without regional suffix)
  // Example: "Storage" but not "Storage.AustraliaCentral2"
  const baseTag = tag.split('.')[0];
  if (POPULAR_SERVICE_TAGS.includes(baseTag) && tag === baseTag) {
    return true;
  }

  return false;
}

/**
 * Gets all guide pages from the content/guides directory
 * @returns {Array<{category: string, slug: string, lastmod: string}>} Array of guide entries
 */
function getGuidePages() {
  const guides = [];

  if (!fs.existsSync(GUIDES_DIR)) {
    return guides;
  }

  const categories = fs.readdirSync(GUIDES_DIR).filter(item => {
    const fullPath = path.join(GUIDES_DIR, item);
    return fs.statSync(fullPath).isDirectory();
  });

  for (const category of categories) {
    const categoryPath = path.join(GUIDES_DIR, category);
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      const slug = file.replace(/\.md$/, '');

      // Use the guide's date as lastmod, or fall back to file mtime
      let lastmod;
      if (data.date) {
        lastmod = new Date(data.date).toISOString();
      } else {
        const stats = fs.statSync(filePath);
        lastmod = stats.mtime.toISOString();
      }

      guides.push({ category, slug, lastmod });
    }
  }

  return guides;
}

/**
 * Escapes XML special characters to prevent XML injection
 * @param {string} unsafe - String that may contain XML special characters
 * @returns {string} XML-safe string
 */
function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Validates service tag name format
 * @param {string} tag - Service tag name to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidServiceTag(tag) {
  return typeof tag === 'string' && /^[a-zA-Z0-9._-]+$/.test(tag);
}

function generateSitemap() {
  console.log('Generating sitemap.xml...');

  const currentDate = new Date().toISOString();

  // Get all guide pages
  const guidePages = getGuidePages();
  console.log(`Found ${guidePages.length} guide pages`);

  // Read all service tags from the data files
  const serviceTags = new Set();

  try {
    // Only read from main Azure Cloud file since it contains all service tags
    const filePath = path.join(PUBLIC_DATA_DIR, 'AzureCloud.json');

    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.values && Array.isArray(data.values)) {
        data.values.forEach(item => {
          if (item.name) {
            serviceTags.add(item.name);
          }
        });
      }
    } else {
      console.error(`Error: ${filePath} not found`);
      process.exit(1);
    }

    // Convert Set to sorted array
    const serviceTagsArray = Array.from(serviceTags).sort();

    // Filter to only popular service tags
    const includedTags = serviceTagsArray.filter(tag =>
      isValidServiceTag(tag) && shouldIncludeServiceTag(tag)
    );

    console.log(`Found ${serviceTagsArray.length} unique service tags`);
    console.log(`Including ${includedTags.length} popular service tags in sitemap`);

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/about/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Tool Pages -->
  <url>
    <loc>${BASE_URL}/tools/ip-lookup/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tools/service-tags/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tools/tenant-lookup/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tools/subnet-calculator/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tools/azure-rbac-calculator/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tools/entraid-roles-calculator/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>
  <!-- Guides Section -->
  <url>
    <loc>${BASE_URL}/guides/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
${guidePages.map(guide => `  <url>
    <loc>${escapeXml(`${BASE_URL}/guides/${encodeURIComponent(guide.category)}/${encodeURIComponent(guide.slug)}/`)}</loc>
    <lastmod>${guide.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
  <!-- Popular Service Tag Pages -->
${serviceTagsArray
  .filter(tag => {
    if (!isValidServiceTag(tag)) {
      console.warn(`⚠ Skipping invalid service tag: ${tag}`);
      return false;
    }
    // Only include popular/commonly-used service tags
    return shouldIncludeServiceTag(tag);
  })
  .map((tag) => {
    // Apply both URL encoding and XML escaping for defense in depth
    const urlEncodedTag = encodeURIComponent(tag);
    const xmlSafeUrl = escapeXml(`${BASE_URL}/tools/service-tags/${urlEncodedTag}/`);
    return `  <url>
    <loc>${xmlSafeUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  })
  .join('\n')}
</urlset>`;

    // Write sitemap to output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const sitemapPath = path.join(OUTPUT_DIR, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);

    console.log(`✓ Sitemap generated successfully at ${sitemapPath}`);
    const totalUrls = 9 + guidePages.length + includedTags.length;
    console.log(`  Total URLs: ${totalUrls} (9 core pages + ${guidePages.length} guides + ${includedTags.length} service tags)`);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateSitemap();
}

module.exports = { generateSitemap };
