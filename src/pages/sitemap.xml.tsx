import { GetServerSideProps } from 'next';

const createSitemap = (hostname: string) => {
  const pages = ['/', '/about'];
  const currentDate = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${pages
        .map(
          (page) => `
            <url>
              <loc>${hostname}${page}</loc>
              <lastmod>${currentDate}</lastmod>
              <changefreq>${page === '/' ? 'daily' : 'weekly'}</changefreq>
              <priority>${page === '/' ? '1.0' : '0.8'}</priority>
            </url>
          `
        )
        .join('')}
    </urlset>`;
};

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const hostname = 'https://azurehub.org';

  res.setHeader('Content-Type', 'text/xml');
  res.write(createSitemap(hostname));
  res.end();

  return {
    props: {},
  };
};

// Default export to prevent next.js errors
export default function Sitemap() {
  return null;
}
