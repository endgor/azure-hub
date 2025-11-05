import * as fs from 'fs';
import * as path from 'path';

// Type definitions
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

interface ServiceTagIndex {
  id: string;
  systemService: string;
  region: string;
  prefixCount: number;
}

interface RegionIndex {
  region: string;
  serviceCount: number;
  prefixCount: number;
}

// File paths
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const AZURE_CLOUD_FILE = path.join(DATA_DIR, 'AzureCloud.json');
const SERVICE_TAGS_INDEX = path.join(DATA_DIR, 'service-tags-index.json');
const REGIONS_INDEX = path.join(DATA_DIR, 'regions-index.json');

/**
 * Generate lightweight service tags index
 * Contains only metadata, not the full IP address lists
 */
function generateServiceTagsIndex(data: AzureCloudData): ServiceTagIndex[] {
  console.log('Generating service tags index...');

  const serviceTags: ServiceTagIndex[] = data.values.map(tag => ({
    id: tag.name,
    systemService: tag.properties.systemService || '',
    region: tag.properties.region || '',
    prefixCount: tag.properties.addressPrefixes?.length || 0
  }));

  console.log(`✓ Generated index with ${serviceTags.length} service tags`);
  return serviceTags;
}

/**
 * Generate regions index with aggregated statistics
 */
function generateRegionsIndex(data: AzureCloudData): RegionIndex[] {
  console.log('Generating regions index...');

  const regionMap = new Map<string, { serviceCount: number; prefixCount: number }>();

  for (const tag of data.values) {
    const region = tag.properties.region || '';
    if (!region) continue;

    const existing = regionMap.get(region) || { serviceCount: 0, prefixCount: 0 };
    existing.serviceCount += 1;
    existing.prefixCount += tag.properties.addressPrefixes?.length || 0;
    regionMap.set(region, existing);
  }

  const regions: RegionIndex[] = Array.from(regionMap.entries())
    .map(([region, stats]) => ({
      region,
      serviceCount: stats.serviceCount,
      prefixCount: stats.prefixCount
    }))
    .sort((a, b) => a.region.localeCompare(b.region));

  console.log(`✓ Generated index with ${regions.length} regions`);
  return regions;
}

/**
 * Calculate file size reduction
 */
function calculateSizeReduction(originalSize: number, newSize: number): string {
  const reduction = ((originalSize - newSize) / originalSize) * 100;
  return `${reduction.toFixed(1)}%`;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('Starting IP data indexes generation...\n');

  // Check if Azure Cloud file exists
  if (!fs.existsSync(AZURE_CLOUD_FILE)) {
    console.error(`ERROR: Azure Cloud data file not found: ${AZURE_CLOUD_FILE}`);
    console.error('Please run: npm run update-ip-data');
    process.exit(1);
  }

  try {
    // Load Azure Cloud data
    console.log(`Reading data from ${AZURE_CLOUD_FILE}...`);
    const originalData = fs.readFileSync(AZURE_CLOUD_FILE, 'utf8');
    const data = JSON.parse(originalData) as AzureCloudData;
    console.log(`✓ Loaded ${data.values.length} service tags\n`);

    const originalSize = Buffer.byteLength(originalData, 'utf8');

    // Generate service tags index
    const serviceTagsIndex = generateServiceTagsIndex(data);
    const serviceTagsJson = JSON.stringify(serviceTagsIndex, null, 2);
    fs.writeFileSync(SERVICE_TAGS_INDEX, serviceTagsJson, 'utf8');
    const serviceTagsSize = Buffer.byteLength(serviceTagsJson, 'utf8');
    console.log(`  Saved to: ${SERVICE_TAGS_INDEX}`);
    console.log(`  Size: ${(serviceTagsSize / 1024).toFixed(1)} KB (${calculateSizeReduction(originalSize, serviceTagsSize)} smaller)\n`);

    // Generate regions index
    const regionsIndex = generateRegionsIndex(data);
    const regionsJson = JSON.stringify(regionsIndex, null, 2);
    fs.writeFileSync(REGIONS_INDEX, regionsJson, 'utf8');
    const regionsSize = Buffer.byteLength(regionsJson, 'utf8');
    console.log(`  Saved to: ${REGIONS_INDEX}`);
    console.log(`  Size: ${(regionsSize / 1024).toFixed(1)} KB (${calculateSizeReduction(originalSize, regionsSize)} smaller)\n`);

    console.log('IP data indexes generation completed!\n');
    console.log('Summary:');
    console.log(`  Original file: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Service tags index: ${(serviceTagsSize / 1024).toFixed(1)} KB`);
    console.log(`  Regions index: ${(regionsSize / 1024).toFixed(1)} KB`);
    console.log('\nThese lightweight indexes can be used for:');
    console.log('  - Service tag dropdowns/autocomplete');
    console.log('  - Region selection lists');
    console.log('  - Statistics and metadata without loading full IP lists');

  } catch (error: any) {
    console.error('\nFailed to generate IP indexes:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error during IP indexes generation:', error.message || error);
    process.exit(1);
  });
}

export { generateServiceTagsIndex, generateRegionsIndex };
