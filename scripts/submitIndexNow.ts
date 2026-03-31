/**
 * Submit URLs to IndexNow for immediate indexing by Bing and other search engines.
 *
 * Usage:
 *   INDEXNOW_SECRET=<secret> ts-node scripts/submitIndexNow.ts [--all | --url /path1 /path2]
 *
 * --all   Submit all indexable pages (tools, guides, about, home)
 * --url   Submit specific URL paths
 *
 * Without arguments, submits the core tool pages (most common after data updates).
 */

const INDEXNOW_KEY = '869fc665e77e4ca4be074a8685df12a4';
const SITE_URL = 'https://azurehub.org';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const CORE_PAGES = [
  '/',
  '/about/',
  '/tools/ip-lookup/',
  '/tools/service-tags/',
  '/tools/tenant-lookup/',
  '/tools/subnet-calculator/',
  '/tools/azure-rbac-calculator/',
  '/tools/entraid-roles-calculator/',
  '/tools/ip-changes/',
  '/tools/private-dns-zones/',
  '/guides/',
];

function getGuideUrls(): string[] {
  const guidesDir = path.join(process.cwd(), 'content', 'guides');
  const urls: string[] = [];

  if (!fs.existsSync(guidesDir)) return urls;

  const categories = fs.readdirSync(guidesDir).filter((item: string) => {
    return fs.statSync(path.join(guidesDir, item)).isDirectory();
  });

  for (const category of categories) {
    const files = fs.readdirSync(path.join(guidesDir, category)).filter((f: string) => f.endsWith('.md'));
    for (const file of files) {
      const slug = file.replace(/\.md$/, '');
      urls.push(`/guides/${category}/${slug}/`);
    }
  }

  return urls;
}

async function submitUrls(urlPaths: string[]) {
  const fullUrls = urlPaths.map((p) => `${SITE_URL}${p}`);

  console.log(`Submitting ${fullUrls.length} URLs to IndexNow...`);

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: 'azurehub.org',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: fullUrls,
    }),
  });

  if (response.ok || response.status === 202) {
    console.log(`Successfully submitted ${fullUrls.length} URLs`);
    for (const url of fullUrls) {
      console.log(`  ${url}`);
    }
  } else {
    const text = await response.text();
    console.error(`IndexNow returned ${response.status}: ${text}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  let urls: string[];

  if (args.includes('--all')) {
    urls = [...CORE_PAGES, ...getGuideUrls()];
  } else if (args.includes('--url')) {
    const urlIndex = args.indexOf('--url');
    urls = args.slice(urlIndex + 1);
    if (urls.length === 0) {
      console.error('No URLs provided after --url');
      process.exit(1);
    }
  } else {
    // Default: submit core tool pages (common after data updates)
    urls = CORE_PAGES;
  }

  await submitUrls(urls);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
