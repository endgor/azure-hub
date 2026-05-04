/**
 * Quick traffic snapshot from the Cloudflare GraphQL Analytics API.
 *
 * Usage:
 *   npm run cf-stats             # last 7 days for azurehub.org
 *   npm run cf-stats -- --days 30
 *   npm run cf-stats -- --zone example.com --days 14
 *
 * Auth: uses CLOUDFLARE_API_TOKEN if set, otherwise falls back to the
 * OAuth token stored by `wrangler login`.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const REST_BASE = 'https://api.cloudflare.com/client/v4';
const DEFAULT_ZONE = 'azurehub.org';

type DailyRow = {
  dimensions: { date: string };
  sum: { requests: number; pageViews: number; bytes: number; cachedRequests: number; threats: number };
  uniq: { uniques: number };
};

function parseArgs(argv: string[]) {
  const args: { days: number; zone: string } = { days: 7, zone: DEFAULT_ZONE };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--days') args.days = Number(argv[++i]);
    else if (arg === '--zone') args.zone = argv[++i];
  }
  if (!Number.isFinite(args.days) || args.days < 1 || args.days > 30) {
    throw new Error('--days must be between 1 and 30');
  }
  return args;
}

function getToken(): string {
  const fromEnv = process.env.CLOUDFLARE_API_TOKEN;
  if (fromEnv) return fromEnv;
  const wranglerConfigPath = join(homedir(), 'Library/Preferences/.wrangler/config/default.toml');
  try {
    const toml = readFileSync(wranglerConfigPath, 'utf8');
    const match = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  } catch {
    // fall through
  }
  throw new Error(
    'No Cloudflare token found. Set CLOUDFLARE_API_TOKEN or run `wrangler login`.',
  );
}

async function cfFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Cloudflare API ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { success?: boolean; result?: T; errors?: unknown; data?: T };
  if (json.success === false) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(json.errors)}`);
  }
  return (json.data ?? json.result) as T;
}

async function resolveZone(zoneName: string, token: string): Promise<{ id: string; accountId: string }> {
  type ZoneListResult = Array<{ id: string; name: string; account: { id: string } }>;
  const data = await cfFetch<ZoneListResult>(
    `${REST_BASE}/zones?name=${encodeURIComponent(zoneName)}`,
    token,
  );
  const zone = data.find((z) => z.name === zoneName);
  if (!zone) throw new Error(`Zone not found: ${zoneName}`);
  return { id: zone.id, accountId: zone.account.id };
}

async function fetchDailyStats(zoneId: string, days: number, token: string): Promise<DailyRow[]> {
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const query = `
    query ($zone: String!, $start: Date!, $end: Date!, $limit: Int!) {
      viewer {
        zones(filter: { zoneTag: $zone }) {
          httpRequests1dGroups(
            filter: { date_geq: $start, date_leq: $end }
            limit: $limit
            orderBy: [date_ASC]
          ) {
            dimensions { date }
            sum { requests pageViews bytes cachedRequests threats }
            uniq { uniques }
          }
        }
      }
    }
  `;

  const data = await cfFetch<{ viewer: { zones: Array<{ httpRequests1dGroups: DailyRow[] }> } }>(
    GRAPHQL_URL,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        query,
        variables: { zone: zoneId, start: fmt(start), end: fmt(today), limit: days },
      }),
    },
  );
  return data.viewer.zones[0]?.httpRequests1dGroups ?? [];
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function printTable(rows: DailyRow[]): void {
  const header = ['Date', 'Uniques', 'PageViews', 'Requests', 'Cached%', 'Bandwidth', 'Threats'];
  const data = rows.map((r) => {
    const cachedPct = r.sum.requests ? Math.round((r.sum.cachedRequests / r.sum.requests) * 100) : 0;
    return [
      r.dimensions.date,
      r.uniq.uniques.toLocaleString(),
      r.sum.pageViews.toLocaleString(),
      r.sum.requests.toLocaleString(),
      `${cachedPct}%`,
      formatBytes(r.sum.bytes),
      r.sum.threats.toLocaleString(),
    ];
  });

  const widths = header.map((h, i) =>
    Math.max(h.length, ...data.map((row) => row[i].length)),
  );
  const line = (cells: string[]) =>
    cells.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ');

  console.log(line(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  data.forEach((row) => console.log(line(row)));
}

function printTotals(rows: DailyRow[]): void {
  if (rows.length === 0) return;
  const totals = rows.reduce(
    (acc, r) => ({
      uniques: acc.uniques + r.uniq.uniques,
      pageViews: acc.pageViews + r.sum.pageViews,
      requests: acc.requests + r.sum.requests,
      bytes: acc.bytes + r.sum.bytes,
    }),
    { uniques: 0, pageViews: 0, requests: 0, bytes: 0 },
  );
  console.log('');
  console.log(`Period total: ${rows.length} day(s)`);
  console.log(`  Sum of daily uniques: ${totals.uniques.toLocaleString()} (note: bots inflate this)`);
  console.log(`  Page views:           ${totals.pageViews.toLocaleString()}`);
  console.log(`  Requests:             ${totals.requests.toLocaleString()}`);
  console.log(`  Bandwidth:            ${formatBytes(totals.bytes)}`);
  const avgPv = Math.round(totals.pageViews / rows.length);
  console.log(`  Daily avg page views: ${avgPv.toLocaleString()}`);
}

async function main(): Promise<void> {
  const { days, zone } = parseArgs(process.argv.slice(2));
  const token = getToken();
  const { id: zoneId } = await resolveZone(zone, token);
  console.log(`Cloudflare traffic for ${zone} — last ${days} day(s)\n`);
  const rows = await fetchDailyStats(zoneId, days, token);
  if (rows.length === 0) {
    console.log('No data returned.');
    return;
  }
  printTable(rows);
  printTotals(rows);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
