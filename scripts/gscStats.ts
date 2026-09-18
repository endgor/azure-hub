/**
 * Search performance snapshot from the Google Search Console API.
 *
 * Usage:
 *   npm run gsc-stats                       # 28-day overview: traffic, top queries and pages
 *   npm run gsc-stats -- --days 90
 *   npm run gsc-stats -- --queries 40       # top queries only
 *   npm run gsc-stats -- --pages 40         # top pages only
 *   npm run gsc-stats -- --page /tools/ip-lookup      # queries driving one page
 *   npm run gsc-stats -- --query "azure ip lookup"    # pages ranking for one query
 *   npm run gsc-stats -- --cannibalization 25         # queries answered by more than one page
 *   npm run gsc-stats -- --inspect /tools/vm-pricing/Standard_D2s_v5/
 *   npm run gsc-stats -- --inspect-sitemap 50         # sample the sitemap and inspect each URL
 *   npm run gsc-stats -- --json --queries 100         # machine-readable
 *
 * Auth: a Google service account with the Search Console API enabled, added under
 * Search Console > Settings > Users and permissions (Restricted is enough).
 * Point GOOGLE_APPLICATION_CREDENTIALS or GSC_SERVICE_ACCOUNT_KEY at the JSON key
 * file (or paste the JSON itself), via the environment or .env.local in the repo root.
 *
 * Google reports on a 2-3 day lag, so a window ending today is always partly empty.
 */

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SEARCH_ANALYTICS_BASE = 'https://searchconsole.googleapis.com/webmasters/v3';
const URL_INSPECTION_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

const DEFAULT_SITE = 'https://azurehub.org/';
const DEFAULT_DAYS = 28;
const ROW_LIMIT = 25000;
const INSPECTION_CONCURRENCY = 2;
const INSPECTION_CAP = 2000;

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
};

type SearchAnalyticsRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type Aggregate = {
  key: string;
  clicks: number;
  impressions: number;
  position: number;
};

type IndexStatusResult = {
  verdict?: string;
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  googleCanonical?: string;
  userCanonical?: string;
  sitemap?: string[];
};

type Options = {
  days: number;
  site: string;
  json: boolean;
  queries: number | null;
  pages: number | null;
  page: string | null;
  query: string | null;
  cannibalization: number | null;
  inspect: string[];
  inspectSitemap: number | null;
};

export function parseArgs(argv: string[]): Options {
  const opts: Options = {
    days: DEFAULT_DAYS,
    site: DEFAULT_SITE,
    json: false,
    queries: null,
    pages: null,
    page: null,
    query: null,
    cannibalization: null,
    inspect: [],
    inspectSitemap: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    const nextIsValue = next !== undefined && !next.startsWith('--');

    if (arg === '--days') {
      if (!nextIsValue) throw new Error('--days needs a number');
      opts.days = Number(next);
      i += 1;
    } else if (arg === '--site') {
      if (!nextIsValue) throw new Error('--site needs a URL');
      opts.site = next;
      i += 1;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--queries') {
      opts.queries = nextIsValue ? Number(next) : 25;
      if (nextIsValue) i += 1;
    } else if (arg === '--pages') {
      opts.pages = nextIsValue ? Number(next) : 25;
      if (nextIsValue) i += 1;
    } else if (arg === '--page') {
      if (!nextIsValue) throw new Error('--page needs a URL or path');
      opts.page = next;
      i += 1;
    } else if (arg === '--query') {
      if (!nextIsValue) throw new Error('--query needs a search term');
      opts.query = next;
      i += 1;
    } else if (arg === '--cannibalization') {
      opts.cannibalization = nextIsValue ? Number(next) : 25;
      if (nextIsValue) i += 1;
    } else if (arg === '--inspect') {
      if (!nextIsValue) throw new Error('--inspect needs a URL or path');
      while (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) {
        opts.inspect.push(argv[i + 1]);
        i += 1;
      }
    } else if (arg === '--inspect-sitemap') {
      opts.inspectSitemap = nextIsValue ? Number(next) : 50;
      if (nextIsValue) i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function readEnvLocal(key: string): string | undefined {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;

  try {
    const contents = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    const match = contents.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm'));
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    // fall through
  }

  return undefined;
}

function getServiceAccount(): ServiceAccountKey {
  const raw =
    readEnvLocal('GSC_SERVICE_ACCOUNT_KEY') ??
    readEnvLocal('GOOGLE_SERVICE_ACCOUNT_KEY') ??
    readEnvLocal('GOOGLE_APPLICATION_CREDENTIALS');

  if (!raw) {
    throw new Error(
      'No Google service account found. Set GOOGLE_APPLICATION_CREDENTIALS (or GSC_SERVICE_ACCOUNT_KEY) ' +
        'to the JSON key path, in the environment or .env.local. The service account needs the Search ' +
        'Console API enabled and must be added under Search Console > Settings > Users and permissions.',
    );
  }

  const contents = raw.trimStart().startsWith('{') ? raw : readFileSync(raw, 'utf8');
  const parsed = JSON.parse(contents) as Partial<ServiceAccountKey>;

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Service account JSON is missing client_email or private_key.');
  }

  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Signed JWT assertion per the OAuth 2.0 service account flow. */
export function buildAssertion(account: ServiceAccountKey, now = Math.floor(Date.now() / 1000)): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.private_key);
  return `${header}.${claims}.${base64Url(signature)}`;
}

async function getAccessToken(account: ServiceAccountKey): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: buildAssertion(account),
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Google token endpoint returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const parsed = JSON.parse(body) as { access_token?: string };
  if (!parsed.access_token) {
    throw new Error(`Google token endpoint returned no access_token: ${body.slice(0, 300)}`);
  }
  return parsed.access_token;
}

async function googleFetch<T>(url: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    const hint =
      res.status === 403
        ? ' — is the service account added as a user on this property, and the Search Console API enabled?'
        : '';
    throw new Error(`Search Console API returned ${res.status}${hint}: ${text.slice(0, 300)}`);
  }

  return JSON.parse(text) as T;
}

/** Google's data lags 2-3 days, so the window ends before the empty tail. */
export function dateRange(days: number, today = new Date()): { startDate: string; endDate: string } {
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

async function searchAnalytics(
  token: string,
  site: string,
  days: number,
  dimensions: string[],
  filters?: Array<{ dimension: string; operator: string; expression: string }>,
): Promise<SearchAnalyticsRow[]> {
  const { startDate, endDate } = dateRange(days);
  const rows: SearchAnalyticsRow[] = [];

  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const payload: Record<string, unknown> = {
      startDate,
      endDate,
      dimensions,
      rowLimit: ROW_LIMIT,
      startRow,
      dataState: 'final',
    };
    if (filters && filters.length > 0) {
      payload.dimensionFilterGroups = [{ filters }];
    }

    const res = await googleFetch<{ rows?: SearchAnalyticsRow[] }>(
      `${SEARCH_ANALYTICS_BASE}/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
      token,
      payload,
    );

    const batch = res.rows ?? [];
    rows.push(...batch);
    if (batch.length < ROW_LIMIT) break;
  }

  return rows;
}

export function toAggregates(rows: SearchAnalyticsRow[]): Aggregate[] {
  return rows
    .map((row) => ({
      key: row.keys?.[0] ?? '(unknown)',
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
}

function ctr(clicks: number, impressions: number): string {
  return impressions > 0 ? `${((clicks / impressions) * 100).toFixed(1)}%` : '—';
}

function printTable(header: string[], rows: string[][], leftAlign = [0]): void {
  if (rows.length === 0) {
    console.log('  (no rows)');
    return;
  }
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells: string[]) =>
    cells
      .map((cell, i) => (leftAlign.includes(i) ? cell.padEnd(widths[i]) : cell.padStart(widths[i])))
      .join('  ');

  console.log(line(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  rows.forEach((row) => console.log(line(row)));
}

function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?azurehub\.org/, '') || '/';
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function aggregateRows(entries: Aggregate[], limit: number, label: string, shorten: boolean): void {
  const rows = entries.slice(0, limit).map((entry) => [
    truncate(shorten ? shortenUrl(entry.key) : entry.key, 62),
    entry.clicks.toLocaleString(),
    entry.impressions.toLocaleString(),
    ctr(entry.clicks, entry.impressions),
    entry.position > 0 ? entry.position.toFixed(1) : '—',
  ]);
  printTable([label, 'Clicks', 'Impr', 'CTR', 'Pos'], rows);
}

function absoluteUrl(site: string, pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  const origin = site.startsWith('sc-domain:')
    ? `https://${site.slice('sc-domain:'.length)}`
    : site.replace(/\/$/, '');
  return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

async function inspectUrl(
  token: string,
  site: string,
  url: string,
): Promise<IndexStatusResult & { url: string }> {
  const res = await googleFetch<{ inspectionResult?: { indexStatusResult?: IndexStatusResult } }>(
    URL_INSPECTION_URL,
    token,
    { inspectionUrl: url, siteUrl: site },
  );
  return { url, ...(res.inspectionResult?.indexStatusResult ?? {}) };
}

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Evenly spaced sample so a large cluster is represented rather than its alphabetical head. */
export function sampleEvenly<T>(items: T[], count: number): T[] {
  if (count >= items.length) return [...items];
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
}

function readSitemapUrls(): string[] {
  const candidates = [join(process.cwd(), 'public', 'sitemap.xml'), join(process.cwd(), 'out', 'sitemap.xml')];

  for (const candidate of candidates) {
    try {
      const xml = readFileSync(candidate, 'utf8');
      const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
      if (urls.length > 0) return urls;
    } catch {
      // try the next candidate
    }
  }

  throw new Error('No sitemap found. Run `npm run build` first, or pass URLs to --inspect directly.');
}

function printInspections(results: Array<IndexStatusResult & { url: string }>): void {
  const rows = results.map((result) => [
    truncate(shortenUrl(result.url), 52),
    result.verdict ?? '—',
    truncate(result.coverageState ?? '—', 34),
    result.googleCanonical && result.googleCanonical !== result.url ? 'differs' : 'self',
    result.lastCrawlTime ? result.lastCrawlTime.slice(0, 10) : 'never',
  ]);
  printTable(['URL', 'Verdict', 'Coverage', 'Canonical', 'Last crawl'], rows, [0, 1, 2, 3]);

  const indexed = results.filter((r) => r.verdict === 'PASS').length;
  const crawled = results.filter((r) => r.lastCrawlTime).length;
  const reCanonicalised = results.filter(
    (r) => r.googleCanonical && r.googleCanonical !== r.url,
  ).length;

  console.log('');
  console.log(`Indexed (verdict PASS):   ${indexed} of ${results.length}`);
  console.log(`Crawled at least once:    ${crawled} of ${results.length}`);
  console.log(`Google picked a different canonical: ${reCanonicalised}`);
}

async function reportCannibalization(
  token: string,
  site: string,
  days: number,
  limit: number,
  json: boolean,
): Promise<void> {
  const rows = await searchAnalytics(token, site, days, ['query', 'page']);

  const byQuery = new Map<string, Aggregate[]>();
  for (const row of rows) {
    const [query, page] = row.keys ?? [];
    if (!query || !page) continue;
    const entry = byQuery.get(query) ?? [];
    entry.push({ key: page, clicks: row.clicks, impressions: row.impressions, position: row.position });
    byQuery.set(query, entry);
  }

  const contested = [...byQuery.entries()]
    .filter(([, pages]) => pages.length > 1)
    .map(([query, pages]) => ({
      query,
      impressions: pages.reduce((acc, p) => acc + p.impressions, 0),
      clicks: pages.reduce((acc, p) => acc + p.clicks, 0),
      pages: pages.sort((a, b) => b.impressions - a.impressions),
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit);

  if (json) {
    console.log(JSON.stringify(contested, null, 2));
    return;
  }

  console.log(`Queries with more than one page earning impressions — top ${limit} queries by impressions\n`);
  for (const entry of contested) {
    console.log(
      `"${entry.query}" — ${entry.impressions.toLocaleString()} impr, ${entry.clicks.toLocaleString()} clicks across ${entry.pages.length} pages`,
    );
    printTable(
      ['Page', 'Clicks', 'Impr', 'Pos'],
      entry.pages.map((page) => [
        truncate(shortenUrl(page.key), 62),
        page.clicks.toLocaleString(),
        page.impressions.toLocaleString(),
        page.position > 0 ? page.position.toFixed(1) : '—',
      ]),
    );
    console.log('');
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const token = await getAccessToken(getServiceAccount());
  const site = opts.site;
  const { startDate, endDate } = dateRange(opts.days);

  if (opts.inspect.length > 0 || opts.inspectSitemap !== null) {
    const urls =
      opts.inspect.length > 0
        ? opts.inspect.map((entry) => absoluteUrl(site, entry))
        : sampleEvenly(readSitemapUrls(), Math.min(opts.inspectSitemap!, INSPECTION_CAP));

    if (urls.length > INSPECTION_CAP) {
      throw new Error(`Refusing to inspect ${urls.length} URLs; the daily quota is about ${INSPECTION_CAP}.`);
    }

    const results = await mapLimited(urls, INSPECTION_CONCURRENCY, (url) => inspectUrl(token, site, url));
    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    console.log(`URL inspection — ${results.length} URL(s)\n`);
    printInspections(results);
    return;
  }

  if (opts.page) {
    const url = absoluteUrl(site, opts.page);
    const rows = await searchAnalytics(token, site, opts.days, ['query'], [
      { dimension: 'page', operator: 'equals', expression: url },
    ]);
    const totals = toAggregates(rows);
    if (opts.json) {
      console.log(JSON.stringify(totals, null, 2));
      return;
    }
    console.log(`Queries for ${url} — ${startDate} to ${endDate}\n`);
    aggregateRows(totals, 50, 'Query', false);
    return;
  }

  if (opts.query) {
    const rows = await searchAnalytics(token, site, opts.days, ['page'], [
      { dimension: 'query', operator: 'equals', expression: opts.query },
    ]);
    const totals = toAggregates(rows);
    if (opts.json) {
      console.log(JSON.stringify(totals, null, 2));
      return;
    }
    console.log(`Pages ranking for "${opts.query}" — ${startDate} to ${endDate}\n`);
    aggregateRows(totals, 50, 'Page', true);
    return;
  }

  if (opts.cannibalization !== null) {
    await reportCannibalization(token, site, opts.days, opts.cannibalization, opts.json);
    return;
  }

  const queriesOnly = opts.queries !== null && opts.pages === null;
  const pagesOnly = opts.pages !== null && opts.queries === null;

  if (queriesOnly || pagesOnly) {
    const dimension = queriesOnly ? 'query' : 'page';
    const limit = (queriesOnly ? opts.queries : opts.pages)!;
    const totals = toAggregates(await searchAnalytics(token, site, opts.days, [dimension]));
    if (opts.json) {
      console.log(JSON.stringify(totals.slice(0, limit), null, 2));
      return;
    }
    console.log(`Top ${dimension === 'query' ? 'queries' : 'pages'} — ${startDate} to ${endDate}\n`);
    aggregateRows(totals, limit, queriesOnly ? 'Query' : 'Page', pagesOnly);
    return;
  }

  const [dateRows, queryRows, pageRows] = await Promise.all([
    searchAnalytics(token, site, opts.days, ['date']),
    searchAnalytics(token, site, opts.days, ['query']),
    searchAnalytics(token, site, opts.days, ['page']),
  ]);

  const queryTotals = toAggregates(queryRows);
  const pageTotals = toAggregates(pageRows);

  if (opts.json) {
    console.log(JSON.stringify({ startDate, endDate, dateRows, queryTotals, pageTotals }, null, 2));
    return;
  }

  const totals = dateRows.reduce(
    (acc, row) => ({ clicks: acc.clicks + row.clicks, impressions: acc.impressions + row.impressions }),
    { clicks: 0, impressions: 0 },
  );

  console.log(`Google Search Console — ${site}, ${startDate} to ${endDate}\n`);
  console.log(`Traffic — last ${Math.min(14, dateRows.length)} of ${dateRows.length} day(s) shown`);
  printTable(
    ['Date', 'Clicks', 'Impr', 'CTR'],
    dateRows
      .slice(-14)
      .map((row) => [
        row.keys?.[0] ?? '—',
        row.clicks.toLocaleString(),
        row.impressions.toLocaleString(),
        ctr(row.clicks, row.impressions),
      ]),
  );
  console.log('');
  console.log(
    `Window total: ${totals.clicks.toLocaleString()} clicks, ${totals.impressions.toLocaleString()} impressions, ${ctr(totals.clicks, totals.impressions)} CTR`,
  );
  console.log('');
  console.log(`Top queries (${Math.min(opts.queries ?? 15, queryTotals.length)} of ${queryTotals.length})`);
  aggregateRows(queryTotals, opts.queries ?? 15, 'Query', false);
  console.log('');
  console.log(`Top pages (${Math.min(opts.pages ?? 15, pageTotals.length)} of ${pageTotals.length})`);
  aggregateRows(pageTotals, opts.pages ?? 15, 'Page', true);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
