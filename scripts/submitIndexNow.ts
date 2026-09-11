/**
 * Submit URLs to IndexNow for immediate indexing by Bing and other search engines.
 *
 * Usage:
 *   ts-node scripts/submitIndexNow.ts [--all | --changed | --url /path1 /path2] [--dry-run]
 *
 * --all      Submit all indexable static pages (tools, guides, about, home)
 * --changed  Submit data-driven pages plus detail pages whose content changed in the
 *            last `track-content-changes` run (public/data/content-changes.json)
 * --url      Submit specific URL paths
 * --dry-run  Print the URL list without POSTing
 *
 * Without arguments, submits the core tool pages (most common after data updates).
 */

import fs from 'fs';
import path from 'path';
import { getChangedPaths, type ContentChangesManifest } from '../src/lib/contentChanges';

const INDEXNOW_KEY = '869fc665e77e4ca4be074a8685df12a4';
const SITE_URL = 'https://azurehub.org';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS_PER_REQUEST = 10000;

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

/** Pages whose content is rebuilt from public/data on every daily update. */
const DATA_PAGES = [
  '/',
  '/tools/ip-lookup/',
  '/tools/service-tags/',
  '/tools/ip-changes/',
  '/tools/private-dns-zones/',
  '/tools/vm-pricing/',
  '/tools/azure-rbac-calculator/',
  '/tools/entraid-roles-calculator/',
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

function getChangedUrls(): string[] {
  const manifestPath = path.join(process.cwd(), 'public', 'data', 'content-changes.json');
  if (!fs.existsSync(manifestPath)) {
    console.warn('content-changes.json not found; submitting data pages only');
    return [];
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ContentChangesManifest;
  return getChangedPaths(manifest);
}

/** Regional service tag pages are noindex; submitting them would waste quota and confuse Bing. */
function assertNoRegionalServiceTags(urlPaths: string[]): void {
  const regional = urlPaths.filter((p) => {
    const match = /^\/tools\/service-tags\/([^/]+)/.exec(p);
    return match !== null && decodeURIComponent(match[1]).includes('.');
  });
  if (regional.length > 0) {
    throw new Error(`Refusing to submit regional service tag pages: ${regional.join(', ')}`);
  }
}

async function postBatch(fullUrls: string[]): Promise<void> {
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

async function submitUrls(urlPaths: string[], dryRun: boolean) {
  const unique = Array.from(new Set(urlPaths));
  assertNoRegionalServiceTags(unique);
  const fullUrls = unique.map((p) => `${SITE_URL}${p}`);

  if (dryRun) {
    console.log(`Dry run: ${fullUrls.length} URLs would be submitted to IndexNow`);
    for (const url of fullUrls) {
      console.log(`  ${url}`);
    }
    return;
  }

  console.log(`Submitting ${fullUrls.length} URLs to IndexNow...`);
  for (let i = 0; i < fullUrls.length; i += MAX_URLS_PER_REQUEST) {
    await postBatch(fullUrls.slice(i, i + MAX_URLS_PER_REQUEST));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let urls: string[];

  if (args.includes('--all')) {
    urls = [...CORE_PAGES, ...getGuideUrls()];
  } else if (args.includes('--changed')) {
    urls = [...DATA_PAGES, ...getChangedUrls()];
  } else if (args.includes('--url')) {
    const urlIndex = args.indexOf('--url');
    urls = args.slice(urlIndex + 1).filter((arg) => arg !== '--dry-run');
    if (urls.length === 0) {
      console.error('No URLs provided after --url');
      process.exit(1);
    }
  } else {
    // Default: submit core tool pages (common after data updates)
    urls = CORE_PAGES;
  }

  await submitUrls(urls, dryRun);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
