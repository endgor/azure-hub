import { GetServerSideProps } from 'next';
import { getAllServiceTags } from '@/lib/ipService';

const createSitemap = async (hostname: string) => {
  const currentDate = new Date().toISOString();
  
  // Static pages with their priorities and change frequencies
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/about', priority: '0.8', changefreq: 'weekly' },
    { url: '/service-tags', priority: '0.9', changefreq: 'daily' }
  ];

  let urls = staticPages
    .map(
      (page) => `
        <url>
          <loc>${hostname}${page.url}</loc>
          <lastmod>${currentDate}</lastmod>
          <changefreq>${page.changefreq}</changefreq>
          <priority>${page.priority}</priority>
        </url>
      `
    )
    .join('');

  try {
    // Get all service tags for dynamic pages
    const serviceTags = await getAllServiceTags();
    
    // Add service tag pages to sitemap
    const serviceTagUrls = serviceTags
      .map(
        (serviceTag) => `
          <url>
            <loc>${hostname}/service-tags/${encodeURIComponent(serviceTag)}</loc>
            <lastmod>${currentDate}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.7</priority>
          </url>
        `
      )
      .join('');
    
    urls += serviceTagUrls;
  } catch (error) {
    console.error('Error generating service tag URLs for sitemap:', error);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`;
};

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const hostname = 'https://azurehub.org';

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
  
  const sitemap = await createSitemap(hostname);
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

// Default export to prevent next.js errors
export default function Sitemap() {
  return null;
}
