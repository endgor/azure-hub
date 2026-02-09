import * as fs from 'fs';
import * as path from 'path';
import { cidrToRange, isIPv6 } from '../src/lib/ipUtils';

// Type definitions (same as generateIpIndexes.ts)
interface ServiceTag {
  name: string;
  id: string;
  properties: {
    changeNumber?: number;
    region?: string;
    regionId?: number;
    platform?: string;
    systemService?: string;
    addressPrefixes?: string[];
    networkFeatures?: string[];
  };
}

interface AzureCloudData {
  changeNumber: number;
  cloud: string;
  values: ServiceTag[];
}

type CloudName = 'AzureCloud' | 'AzureChinaCloud' | 'AzureUSGovernment';

// Index types
interface MetaEntry {
  t: string; // serviceTagId
  r: string; // region
  ri: string; // regionId
  s: string; // systemService
  n: string; // networkFeatures
  c: string; // cloud name
}

interface IPv6Entry {
  s: string; // start hex
  e: string; // end hex
  m: number; // meta index
  c: string; // original CIDR
}

interface IpLookupIndex {
  version: 1;
  meta: MetaEntry[];
  ipv4: number[]; // flat triples [start, end, metaIdx, ...]
  ipv4Cidrs: string[]; // parallel CIDR strings
  ipv4MaxSpan: number;
  ipv6: IPv6Entry[];
}

// File paths
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'ip-lookup-index.json');

const CLOUD_FILES: { cloud: CloudName; file: string }[] = [
  { cloud: 'AzureCloud', file: path.join(DATA_DIR, 'AzureCloud.json') },
  { cloud: 'AzureChinaCloud', file: path.join(DATA_DIR, 'AzureChinaCloud.json') },
  { cloud: 'AzureUSGovernment', file: path.join(DATA_DIR, 'AzureUSGovernment.json') },
];

export async function generateIpLookupIndex(): Promise<void> {
  console.log('Starting IP lookup index generation...\n');

  // Verify all cloud files exist
  for (const { cloud, file } of CLOUD_FILES) {
    if (!fs.existsSync(file)) {
      console.error(`ERROR: ${cloud} data file not found: ${file}`);
      console.error('Please run: npm run update-ip-data');
      process.exit(1);
    }
  }

  const metaMap = new Map<string, number>(); // dedup key → index
  const meta: MetaEntry[] = [];
  const ipv4Triples: number[] = [];
  const ipv4Cidrs: string[] = [];
  const ipv6Entries: IPv6Entry[] = [];
  let ipv4Count = 0;
  let ipv6Count = 0;
  let skipped = 0;

  for (const { cloud, file } of CLOUD_FILES) {
    console.log(`Processing ${cloud}...`);
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw) as AzureCloudData;

    let cloudIpv4 = 0;
    let cloudIpv6 = 0;

    for (const tag of data.values) {
      const { name: serviceTagId, properties } = tag;
      const { addressPrefixes = [], systemService, region, regionId, networkFeatures } = properties || {};

      if (addressPrefixes.length === 0) continue;

      // Build dedup key for metadata
      const metaKey = `${cloud}:${serviceTagId}:${region || ''}`;
      let metaIdx = metaMap.get(metaKey);
      if (metaIdx === undefined) {
        metaIdx = meta.length;
        metaMap.set(metaKey, metaIdx);
        meta.push({
          t: serviceTagId,
          r: region || '',
          ri: regionId?.toString() || '',
          s: systemService || '',
          n: networkFeatures?.join(', ') || '',
          c: cloud,
        });
      }

      for (const cidr of addressPrefixes) {
        try {
          const range = cidrToRange(cidr);
          if (range.isV6) {
            ipv6Entries.push({
              s: range.start as string,
              e: range.end as string,
              m: metaIdx,
              c: cidr,
            });
            cloudIpv6++;
          } else {
            ipv4Triples.push(range.start as number, range.end as number, metaIdx);
            ipv4Cidrs.push(cidr);
            cloudIpv4++;
          }
        } catch {
          skipped++;
        }
      }
    }

    ipv4Count += cloudIpv4;
    ipv6Count += cloudIpv6;
    console.log(`  ✓ ${cloud}: ${cloudIpv4} IPv4 ranges, ${cloudIpv6} IPv6 ranges\n`);
  }

  // Sort IPv4 by start ascending
  console.log('Sorting IPv4 ranges...');
  const ipv4Indices = Array.from({ length: ipv4Count }, (_, i) => i);
  ipv4Indices.sort((a, b) => {
    const startA = ipv4Triples[a * 3];
    const startB = ipv4Triples[b * 3];
    if (startA !== startB) return startA - startB;
    return ipv4Triples[a * 3 + 1] - ipv4Triples[b * 3 + 1];
  });

  const sortedIpv4: number[] = new Array(ipv4Count * 3);
  const sortedIpv4Cidrs: string[] = new Array(ipv4Count);
  for (let i = 0; i < ipv4Count; i++) {
    const srcIdx = ipv4Indices[i];
    sortedIpv4[i * 3] = ipv4Triples[srcIdx * 3];
    sortedIpv4[i * 3 + 1] = ipv4Triples[srcIdx * 3 + 1];
    sortedIpv4[i * 3 + 2] = ipv4Triples[srcIdx * 3 + 2];
    sortedIpv4Cidrs[i] = ipv4Cidrs[srcIdx];
  }

  // Compute ipv4MaxSpan
  let ipv4MaxSpan = 0;
  for (let i = 0; i < ipv4Count; i++) {
    const span = sortedIpv4[i * 3 + 1] - sortedIpv4[i * 3];
    if (span > ipv4MaxSpan) ipv4MaxSpan = span;
  }

  // Sort IPv6 by start hex ascending
  console.log('Sorting IPv6 ranges...');
  ipv6Entries.sort((a, b) => {
    if (a.s < b.s) return -1;
    if (a.s > b.s) return 1;
    return a.e < b.e ? -1 : a.e > b.e ? 1 : 0;
  });

  const index: IpLookupIndex = {
    version: 1,
    meta,
    ipv4: sortedIpv4,
    ipv4Cidrs: sortedIpv4Cidrs,
    ipv4MaxSpan,
    ipv6: ipv6Entries,
  };

  console.log('Writing index file...');
  const json = JSON.stringify(index);
  fs.writeFileSync(OUTPUT_FILE, json, 'utf8');
  const fileSize = Buffer.byteLength(json, 'utf8');

  console.log(`\nIP lookup index generation completed!`);
  console.log(`\nSummary:`);
  console.log(`  Metadata entries: ${meta.length}`);
  console.log(`  IPv4 ranges: ${ipv4Count}`);
  console.log(`  IPv6 ranges: ${ipv6Count}`);
  console.log(`  Max IPv4 span: ${ipv4MaxSpan}`);
  console.log(`  Skipped (invalid): ${skipped}`);
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log(`  Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
}

// Run the script
if (require.main === module) {
  generateIpLookupIndex().catch(error => {
    console.error('Unhandled error during IP lookup index generation:', error.message || error);
    process.exit(1);
  });
}
