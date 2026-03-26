import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'private-dns-zones.json');

const RAW_MARKDOWN_URL =
  'https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/articles/private-link/private-endpoint-dns.md';

interface DnsZoneEntry {
  resourceType: string;
  armType: string;
  subresources: string[];
  dnsZoneNames: string[];
  publicDnsForwarders: string[];
  category: string;
  cloud: 'Commercial' | 'Government' | 'China';
}

interface DnsZonesData {
  lastUpdated: string;
  sourceUrl: string;
  entries: DnsZoneEntry[];
}

function parseMarkdownCell(cell: string): string {
  return cell
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/br>/gi, '\n')
    .replace(/<sup>\d+<\/sup>/g, '')
    .trim();
}

function splitMultiValue(cell: string): string[] {
  const parsed = parseMarkdownCell(cell);
  return parsed
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
}

function extractArmType(resourceTypeCell: string): string {
  const match = resourceTypeCell.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
}

function extractDisplayName(resourceTypeCell: string): string {
  const cleaned = parseMarkdownCell(resourceTypeCell);
  const match = cleaned.match(/^([^(]+)/);
  return match ? match[1].trim() : cleaned;
}

function parseTableRows(tableBlock: string): string[][] {
  const rows: string[][] = [];
  const lines = tableBlock.split('\n');

  for (const line of lines) {
    const trimmed = line.replace(/^>\s*/, '').trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;

    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());

    // Skip header and separator rows
    if (cells.every((c) => /^[-:]+$/.test(c))) continue;
    if (cells.some((c) => c === 'Private link resource type' || c === 'Subresource')) continue;

    if (cells.length >= 4) {
      rows.push(cells);
    }
  }

  return rows;
}

function parseMarkdown(markdown: string): DnsZoneEntry[] {
  const entries: DnsZoneEntry[] = [];

  // Split into cloud sections
  const cloudSections: { cloud: DnsZoneEntry['cloud']; content: string }[] = [];

  const commercialStart = markdown.indexOf('## Commercial');
  const governmentStart = markdown.indexOf('## Government');
  const chinaStart = markdown.indexOf('## China');

  if (commercialStart !== -1 && governmentStart !== -1) {
    cloudSections.push({
      cloud: 'Commercial',
      content: markdown.slice(commercialStart, governmentStart),
    });
  }
  if (governmentStart !== -1 && chinaStart !== -1) {
    cloudSections.push({
      cloud: 'Government',
      content: markdown.slice(governmentStart, chinaStart),
    });
  }
  if (chinaStart !== -1) {
    cloudSections.push({
      cloud: 'China',
      content: markdown.slice(chinaStart),
    });
  }

  for (const section of cloudSections) {
    // Split into category sections (### headings)
    const categoryRegex = /^###\s+(.+)$/gm;
    const categoryMatches: { name: string; start: number }[] = [];
    let match;

    while ((match = categoryRegex.exec(section.content)) !== null) {
      categoryMatches.push({ name: match[1].trim(), start: match.index });
    }

    for (let i = 0; i < categoryMatches.length; i++) {
      const category = categoryMatches[i];
      const nextStart = i + 1 < categoryMatches.length ? categoryMatches[i + 1].start : section.content.length;
      const categoryContent = section.content.slice(category.start, nextStart);

      const rows = parseTableRows(categoryContent);

      for (const cells of rows) {
        const [resourceTypeCell, subresourceCell, dnsZoneCell, forwardersCell] = cells;

        const displayName = extractDisplayName(resourceTypeCell);
        const armType = extractArmType(resourceTypeCell);
        const subresources = splitMultiValue(subresourceCell);
        const dnsZoneNames = splitMultiValue(dnsZoneCell);
        const publicDnsForwarders = splitMultiValue(forwardersCell);

        if (dnsZoneNames.length === 0) continue;

        entries.push({
          resourceType: displayName,
          armType,
          subresources,
          dnsZoneNames,
          publicDnsForwarders,
          category: category.name,
          cloud: section.cloud,
        });
      }
    }
  }

  return entries;
}

async function updatePrivateDnsZones(): Promise<void> {
  console.info('Fetching Private Endpoint DNS zone data from Microsoft docs...');

  const response = await fetch(RAW_MARKDOWN_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch markdown: ${response.status} ${response.statusText}`);
  }

  const markdown = await response.text();
  console.info(`Fetched ${(markdown.length / 1024).toFixed(1)} KB of markdown`);

  const entries = parseMarkdown(markdown);
  console.info(`Parsed ${entries.length} DNS zone entries`);

  const commercialCount = entries.filter((e) => e.cloud === 'Commercial').length;
  const governmentCount = entries.filter((e) => e.cloud === 'Government').length;
  const chinaCount = entries.filter((e) => e.cloud === 'China').length;
  console.info(`  Commercial: ${commercialCount}, Government: ${governmentCount}, China: ${chinaCount}`);

  if (entries.length < 30) {
    throw new Error(`Only parsed ${entries.length} entries — expected at least 30. The markdown format may have changed.`);
  }

  const data: DnsZonesData = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    sourceUrl: 'https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns',
    entries,
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.info(`Saved to ${OUTPUT_FILE}`);
  console.info('Private DNS zone data update complete.');
}

if (require.main === module) {
  updatePrivateDnsZones().catch((error) => {
    console.error('Error updating Private DNS zone data:', error.message);
    process.exit(1);
  });
}

export { updatePrivateDnsZones };
