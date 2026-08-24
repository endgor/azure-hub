/**
 * Search performance snapshot from the Bing Webmaster Tools API.
 *
 * Usage:
 *   npm run bing-stats                      # 28-day overview: traffic, index, top queries and pages
 *   npm run bing-stats -- --days 90
 *   npm run bing-stats -- --queries 40      # top queries only
 *   npm run bing-stats -- --pages 40        # top pages only
 *   npm run bing-stats -- --crawl           # daily crawl and index detail
 *   npm run bing-stats -- --page /tools/ip-lookup      # queries driving one page
 *   npm run bing-stats -- --query "azure ip lookup"    # pages ranking for one query
 *   npm run bing-stats -- --cannibalization 25         # queries answered by more than one page
 *   npm run bing-stats -- --json --queries 100         # machine-readable
 *
 * Auth: BING_WEBMASTER_API_KEY from the environment, or .env.local in the repo root.
 * The key comes from Bing Webmaster Tools > Settings > API access.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';
const DEFAULT_SITE = 'https://azurehub.org/';
const DEFAULT_DAYS = 28;
const CANNIBALIZATION_CONCURRENCY = 3;

type QueryStatsRow = {
  Query: string;
  Date: string;
  Clicks: number;
  Impressions: number;
  AvgImpressionPosition: number;
  AvgClickPosition: number;
};

type RankTrafficRow = {
  Date: string;
  Clicks: number;
  Impressions: number;
};

type CrawlStatsRow = {
  Date: string;
  CrawledPages: number;
  InIndex: number;
  InLinks: number;
  Code2xx: number;
  Code301: number;
  Code302: number;
  Code4xx: number;
  Code5xx: number;
  AllOtherCodes: number;
  BlockedByRobotsTxt: number;
  CrawlErrors: number;
  DnsFailures: number;
  ConnectionTimeout: number;
  ContainsMalware: number;
};

type Aggregate = {
  key: string;
  clicks: number;
  impressions: number;
  position: number;
};

type Options = {
  site: string;
  days: number;
  json: boolean;
  crawl: boolean;
  queries: number | null;
  pages: number | null;
  page: string | null;
  query: string | null;
  cannibalization: number | null;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    site: DEFAULT_SITE,
    days: DEFAULT_DAYS,
    json: false,
    crawl: false,
    queries: null,
    pages: null,
    page: null,
    query: null,
    cannibalization: null,
  };

  const readCount = (next: string | undefined, fallback: number): number => {
    const parsed = Number(next);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    const nextIsValue = next !== undefined && !next.startsWith('--');

    if (arg === '--days') {
      opts.days = readCount(next, DEFAULT_DAYS);
      i += 1;
    } else if (arg === '--site') {
      if (!nextIsValue) throw new Error('--site needs a URL');
      opts.site = next.endsWith('/') ? next : `${next}/`;
      i += 1;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--crawl') {
      opts.crawl = true;
    } else if (arg === '--queries') {
      opts.queries = nextIsValue ? readCount(next, 20) : 20;
      if (nextIsValue) i += 1;
    } else if (arg === '--pages') {
      opts.pages = nextIsValue ? readCount(next, 20) : 20;
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
      opts.cannibalization = nextIsValue ? readCount(next, 25) : 25;
      if (nextIsValue) i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function getApiKey(): string {
  const fromEnv = process.env.BING_WEBMASTER_API_KEY;
  if (fromEnv) return fromEnv;

  try {
    const contents = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    const match = contents.match(/^\s*BING_WEBMASTER_API_KEY\s*=\s*(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    // fall through
  }

  throw new Error(
    'No Bing API key found. Set BING_WEBMASTER_API_KEY or add it to .env.local ' +
      '(Bing Webmaster Tools > Settings > API access).',
  );
}

async function bingFetch<T>(
  method: string,
  apiKey: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${API_BASE}/${method}`);
  url.searchParams.set('apikey', apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await res.text();

  if (!res.ok) {
    throw new Error(`Bing API ${method} returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const parsed = JSON.parse(body) as { d?: T; Message?: string };
  if (parsed.d === undefined) {
    throw new Error(`Bing API ${method} returned no data: ${body.slice(0, 300)}`);
  }
  return parsed.d;
}

/** Bing serialises dates as /Date(<epoch ms>-0800)/, where the instant is that day's Pacific midnight. */
function parseBingDate(value: string): string {
  const match = value.match(/\/Date\((-?\d+)/);
  if (!match) return 'unknown';
  return new Date(Number(match[1])).toISOString().slice(0, 10);
}

function cutoffDate(days: number): string {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  return cutoff.toISOString().slice(0, 10);
}

function withinWindow<T extends { Date: string }>(rows: T[], days: number): Array<T & { day: string }> {
  const cutoff = cutoffDate(days);
  return rows
    .map((row) => ({ ...row, day: parseBingDate(row.Date) }))
    .filter((row) => row.day >= cutoff);
}

function aggregate(rows: Array<QueryStatsRow & { day: string }>): Aggregate[] {
  const totals = new Map<string, { clicks: number; impressions: number; weighted: number }>();

  for (const row of rows) {
    const entry = totals.get(row.Query) ?? { clicks: 0, impressions: 0, weighted: 0 };
    entry.clicks += row.Clicks;
    entry.impressions += row.Impressions;
    if (row.AvgImpressionPosition > 0) {
      entry.weighted += row.AvgImpressionPosition * row.Impressions;
    }
    totals.set(row.Query, entry);
  }

  return Array.from(totals.entries())
    .map(([key, value]) => ({
      key,
      clicks: value.clicks,
      impressions: value.impressions,
      position: value.impressions > 0 ? value.weighted / value.impressions : 0,
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

function printTrafficSummary(rows: Array<RankTrafficRow & { day: string }>): void {
  const totals = rows.reduce(
    (acc, row) => ({ clicks: acc.clicks + row.Clicks, impressions: acc.impressions + row.Impressions }),
    { clicks: 0, impressions: 0 },
  );

  const table = rows
    .slice(-14)
    .map((row) => [row.day, row.Clicks.toLocaleString(), row.Impressions.toLocaleString(), ctr(row.Clicks, row.Impressions)]);

  console.log(`Traffic — last ${Math.min(14, rows.length)} of ${rows.length} day(s) shown`);
  printTable(['Date', 'Clicks', 'Impr', 'CTR'], table);
  console.log('');
  console.log(`Window total: ${totals.clicks.toLocaleString()} clicks, ${totals.impressions.toLocaleString()} impressions, ${ctr(totals.clicks, totals.impressions)} CTR`);
}

function printCrawlSummary(rows: Array<CrawlStatsRow & { day: string }>, detailed: boolean): void {
  if (rows.length === 0) {
    console.log('No crawl data in this window.');
    return;
  }

  const latest = rows[rows.length - 1];
  const first = rows[0];
  const crawled = rows.reduce((acc, row) => acc + row.CrawledPages, 0);
  const indexDelta = latest.InIndex - first.InIndex;
  const trend = indexDelta === 0 ? 'flat' : `${indexDelta > 0 ? '+' : ''}${indexDelta.toLocaleString()}`;

  console.log(`Index and crawl — ${rows.length} day(s), latest ${latest.day}`);
  console.log(`  Pages in Bing's index:           ${latest.InIndex.toLocaleString()} (${trend} since ${first.day})`);
  console.log(`  Inbound links:                   ${latest.InLinks.toLocaleString()}`);
  console.log(`  Pages crawled in window:         ${crawled.toLocaleString()}`);
  console.log(`  Latest-day 2xx / 301 / 302:      ${latest.Code2xx.toLocaleString()} / ${latest.Code301.toLocaleString()} / ${latest.Code302.toLocaleString()}`);
  console.log(`  Latest-day 4xx / 5xx / other:    ${latest.Code4xx.toLocaleString()} / ${latest.Code5xx.toLocaleString()} / ${latest.AllOtherCodes.toLocaleString()}`);
  console.log(`  Latest-day blocked by robots:    ${latest.BlockedByRobotsTxt.toLocaleString()}`);
  console.log(`  Latest-day errors / DNS / t-out: ${latest.CrawlErrors.toLocaleString()} / ${latest.DnsFailures.toLocaleString()} / ${latest.ConnectionTimeout.toLocaleString()}`);
  console.log('  Response-code counters are trailing totals, not per-day counts, so they are not summed.');

  if (!detailed) return;

  console.log('');
  const table = rows.map((row) => [
    row.day,
    row.InIndex.toLocaleString(),
    row.CrawledPages.toLocaleString(),
    row.Code2xx.toLocaleString(),
    row.Code4xx.toLocaleString(),
    row.Code5xx.toLocaleString(),
    row.AllOtherCodes.toLocaleString(),
    row.BlockedByRobotsTxt.toLocaleString(),
  ]);
  printTable(['Date', 'InIndex', 'Crawled', '2xx', '4xx', '5xx', 'Other', 'Blocked'], table);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(runners);
  return results;
}

async function reportCannibalization(
  apiKey: string,
  site: string,
  days: number,
  topN: number,
  queryTotals: Aggregate[],
  json: boolean,
): Promise<void> {
  const candidates = queryTotals
    .slice()
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, topN);

  const results = await mapWithConcurrency(candidates, CANNIBALIZATION_CONCURRENCY, async (candidate) => {
    const rows = await bingFetch<QueryStatsRow[]>('GetQueryPageStats', apiKey, {
      siteUrl: site,
      query: candidate.key,
    });
    const pages = aggregate(withinWindow(rows, days)).filter((page) => page.impressions > 0);
    return { query: candidate.key, impressions: candidate.impressions, clicks: candidate.clicks, pages };
  });

  const contested = results
    .filter((result) => result.pages.length > 1)
    .sort((a, b) => b.impressions - a.impressions);

  if (json) {
    console.log(JSON.stringify(contested, null, 2));
    return;
  }

  console.log(`Queries with more than one page earning impressions — top ${candidates.length} queries by impressions`);
  console.log('');

  if (contested.length === 0) {
    console.log('  None. Every checked query is answered by a single page.');
    return;
  }

  for (const result of contested) {
    console.log(`"${result.query}" — ${result.impressions.toLocaleString()} impr, ${result.clicks.toLocaleString()} clicks across ${result.pages.length} pages`);
    const rows = result.pages.map((page) => [
      truncate(shortenUrl(page.key), 60),
      page.clicks.toLocaleString(),
      page.impressions.toLocaleString(),
      page.position > 0 ? page.position.toFixed(1) : '—',
    ]);
    printTable(['Page', 'Clicks', 'Impr', 'Pos'], rows);
    console.log('');
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const apiKey = getApiKey();
  const site = opts.site;
  const params = { siteUrl: site };

  if (opts.page) {
    const url = opts.page.startsWith('http') ? opts.page : `${site.replace(/\/$/, '')}${opts.page}`;
    const rows = await bingFetch<QueryStatsRow[]>('GetPageQueryStats', apiKey, { ...params, page: url });
    const totals = aggregate(withinWindow(rows, opts.days));
    if (opts.json) {
      console.log(JSON.stringify(totals, null, 2));
      return;
    }
    console.log(`Queries for ${url} — last ${opts.days} day(s)\n`);
    aggregateRows(totals, 50, 'Query', false);
    return;
  }

  if (opts.query) {
    const rows = await bingFetch<QueryStatsRow[]>('GetQueryPageStats', apiKey, { ...params, query: opts.query });
    const totals = aggregate(withinWindow(rows, opts.days));
    if (opts.json) {
      console.log(JSON.stringify(totals, null, 2));
      return;
    }
    console.log(`Pages ranking for "${opts.query}" — last ${opts.days} day(s)\n`);
    aggregateRows(totals, 50, 'Page', true);
    return;
  }

  if (opts.cannibalization !== null) {
    const queryRows = await bingFetch<QueryStatsRow[]>('GetQueryStats', apiKey, params);
    const totals = aggregate(withinWindow(queryRows, opts.days));
    await reportCannibalization(apiKey, site, opts.days, opts.cannibalization, totals, opts.json);
    return;
  }

  const queriesOnly = opts.queries !== null && opts.pages === null && !opts.crawl;
  const pagesOnly = opts.pages !== null && opts.queries === null && !opts.crawl;
  const crawlOnly = opts.crawl && opts.queries === null && opts.pages === null;

  if (queriesOnly) {
    const rows = await bingFetch<QueryStatsRow[]>('GetQueryStats', apiKey, params);
    const totals = aggregate(withinWindow(rows, opts.days));
    if (opts.json) {
      console.log(JSON.stringify(totals.slice(0, opts.queries!), null, 2));
      return;
    }
    console.log(`Top queries — last ${opts.days} day(s)\n`);
    aggregateRows(totals, opts.queries!, 'Query', false);
    return;
  }

  if (pagesOnly) {
    const rows = await bingFetch<QueryStatsRow[]>('GetPageStats', apiKey, params);
    const totals = aggregate(withinWindow(rows, opts.days));
    if (opts.json) {
      console.log(JSON.stringify(totals.slice(0, opts.pages!), null, 2));
      return;
    }
    console.log(`Top pages — last ${opts.days} day(s)\n`);
    aggregateRows(totals, opts.pages!, 'Page', true);
    return;
  }

  if (crawlOnly) {
    const rows = await bingFetch<CrawlStatsRow[]>('GetCrawlStats', apiKey, params);
    const windowed = withinWindow(rows, opts.days).sort((a, b) => a.day.localeCompare(b.day));
    if (opts.json) {
      console.log(JSON.stringify(windowed, null, 2));
      return;
    }
    printCrawlSummary(windowed, true);
    return;
  }

  const [trafficRaw, queryRaw, pageRaw, crawlRaw] = await Promise.all([
    bingFetch<RankTrafficRow[]>('GetRankAndTrafficStats', apiKey, params),
    bingFetch<QueryStatsRow[]>('GetQueryStats', apiKey, params),
    bingFetch<QueryStatsRow[]>('GetPageStats', apiKey, params),
    bingFetch<CrawlStatsRow[]>('GetCrawlStats', apiKey, params),
  ]);

  const traffic = withinWindow(trafficRaw, opts.days).sort((a, b) => a.day.localeCompare(b.day));
  const queryTotals = aggregate(withinWindow(queryRaw, opts.days));
  const pageTotals = aggregate(withinWindow(pageRaw, opts.days));
  const crawl = withinWindow(crawlRaw, opts.days).sort((a, b) => a.day.localeCompare(b.day));

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          site,
          days: opts.days,
          traffic,
          queries: queryTotals.slice(0, opts.queries ?? 50),
          pages: pageTotals.slice(0, opts.pages ?? 50),
          crawl,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Bing Webmaster — ${site} — last ${opts.days} day(s), from ${cutoffDate(opts.days)}\n`);
  printTrafficSummary(traffic);
  console.log('');
  printCrawlSummary(crawl, false);
  console.log('');
  console.log(`Top queries (${Math.min(opts.queries ?? 15, queryTotals.length)} of ${queryTotals.length})`);
  aggregateRows(queryTotals, opts.queries ?? 15, 'Query', false);
  console.log('');
  console.log(`Top pages (${Math.min(opts.pages ?? 15, pageTotals.length)} of ${pageTotals.length})`);
  aggregateRows(pageTotals, opts.pages ?? 15, 'Page', true);

  const wwwPages = pageTotals.filter((entry) => entry.key.includes('://www.'));
  if (wwwPages.length > 0) {
    console.log('');
    console.log(`Note: Bing reports ${wwwPages.length} of ${pageTotals.length} pages on the www host, which redirects to the apex domain.`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
