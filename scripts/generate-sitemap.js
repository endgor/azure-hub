// Generate sitemap.xml for static export
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://azurehub.org';
const OUTPUT_DIR = path.join(process.cwd(), 'out');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');

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
  <url>
    <loc>${BASE_URL}/service-tags/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Dynamic Service Tag Pages -->
${serviceTagsArray
  .map((tag) => {
    return `  <url>
    <loc>${BASE_URL}/service-tags/${encodeURIComponent(tag)}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  })
  .join('\n')}
</urlset>`;

    // Write sitemap to output directory
    const sitemapPath = path.join(OUTPUT_DIR, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);

    console.log(`✓ Sitemap generated successfully at ${sitemapPath}`);
    console.log(`  Total URLs: ${serviceTagsArray.length + 3}`);

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
