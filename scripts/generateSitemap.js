// Generate sitemap.xml for static export
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://azurehub.org';
const OUTPUT_DIR = path.join(process.cwd(), 'public');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');

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
 * Only allows alphanumeric characters, dots, underscores, and hyphens
 * @param {string} tag - Service tag name to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidServiceTag(tag) {
  return typeof tag === 'string' && /^[a-zA-Z0-9._-]+$/.test(tag);
}

function generateSitemap() {
  console.log('Generating sitemap.xml...');

  const currentDate = new Date().toISOString();

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

    console.log(`Found ${serviceTagsArray.length} unique service tags`);

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
    <loc>${BASE_URL}/tools/rbac-calculator/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>
  <!-- Dynamic Service Tag Pages -->
${serviceTagsArray
  .filter(tag => {
    if (!isValidServiceTag(tag)) {
      console.warn(`⚠ Skipping invalid service tag (contains special characters): ${tag}`);
      return false;
    }
    return true;
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
    console.log(`  Total URLs: ${serviceTagsArray.length + 7}`);

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
