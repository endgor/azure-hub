// Generate sitemap.xml for static export
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const BASE_URL = 'https://azurehub.org';
const OUTPUT_DIR = path.join(process.cwd(), 'public');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides');

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

function generateSitemap() {
  console.log('Generating sitemap.xml...');

  const currentDate = new Date().toISOString();

  // Load file-metadata.json for accurate lastmod dates
  let dataLastUpdated = currentDate;
  try {
    const metadataPath = path.join(PUBLIC_DATA_DIR, 'file-metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    if (Array.isArray(metadata) && metadata.length > 0 && metadata[0].lastRetrieved) {
      dataLastUpdated = new Date(metadata[0].lastRetrieved).toISOString();
    }
  } catch {
    console.warn('Warning: Could not read file-metadata.json, using current date for lastmod');
  }

  // Get all guide pages
  const guidePages = getGuidePages();
  console.log(`Found ${guidePages.length} guide pages`);

  // Generate sitemap XML
  try {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${dataLastUpdated}</lastmod>
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
    <lastmod>${dataLastUpdated}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tools/service-tags/</loc>
    <lastmod>${dataLastUpdated}</lastmod>
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
    <lastmod>${dataLastUpdated}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tools/entraid-roles-calculator/</loc>
    <lastmod>${dataLastUpdated}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tools/private-dns-zones/</loc>
    <lastmod>${dataLastUpdated}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/tools/ip-changes/</loc>
    <lastmod>${dataLastUpdated}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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

</urlset>`;

    // Write sitemap to output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const sitemapPath = path.join(OUTPUT_DIR, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);

    console.log(`✓ Sitemap generated successfully at ${sitemapPath}`);
    const totalUrls = 11 + guidePages.length;
    console.log(`  Total URLs: ${totalUrls} (11 core pages + ${guidePages.length} guides)`);

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
