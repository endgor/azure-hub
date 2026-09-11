import * as fs from 'fs';
import * as path from 'path';
import { buildIpLookupIndex, type ServiceTagCloudDocument } from '../src/lib/ipLookupIndex';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'ip-lookup-index.json');

const CLOUDS = ['AzureCloud', 'AzureChinaCloud', 'AzureUSGovernment'] as const;

export async function generateIpLookupIndex(): Promise<void> {
  console.log('Starting IP lookup index generation...\n');

  const documents: ServiceTagCloudDocument[] = [];
  for (const cloud of CLOUDS) {
    const file = path.join(DATA_DIR, `${cloud}.json`);
    if (!fs.existsSync(file)) {
      console.error(`ERROR: ${cloud} data file not found: ${file}`);
      console.error('Please run: npm run update-ip-data');
      process.exit(1);
    }
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Omit<ServiceTagCloudDocument, 'cloud'>;
    documents.push({ cloud, values: parsed.values });
  }

  const { index, stats } = buildIpLookupIndex(documents);
  const json = JSON.stringify(index);
  fs.writeFileSync(OUTPUT_FILE, json, 'utf8');

  console.log('IP lookup index generation completed!');
  console.log(`  Metadata entries: ${stats.meta}`);
  console.log(`  IPv4 ranges: ${stats.ipv4}`);
  console.log(`  IPv6 ranges: ${stats.ipv6}`);
  console.log(`  Skipped (invalid): ${stats.skipped}`);
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log(`  Size: ${(Buffer.byteLength(json, 'utf8') / 1024 / 1024).toFixed(2)} MB`);
}

if (require.main === module) {
  generateIpLookupIndex().catch((error) => {
    console.error('Unhandled error during IP lookup index generation:', error.message || error);
    process.exit(1);
  });
}
