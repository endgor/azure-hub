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

type CloudName = 'AzureCloud' | 'AzureChinaCloud' | 'AzureUSGovernment';

interface ServiceTagIndex {
  id: string;
  systemService: string;
  region: string;
  prefixCount: number;
  cloud: CloudName;
}

interface RegionIndex {
  region: string;
  serviceCount: number;
  prefixCount: number;
  cloud: CloudName;
}

// File paths
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const SERVICE_TAGS_INDEX = path.join(DATA_DIR, 'service-tags-index.json');
const REGIONS_INDEX = path.join(DATA_DIR, 'regions-index.json');

// All cloud files to process
const CLOUD_FILES: { cloud: CloudName; file: string }[] = [
  { cloud: 'AzureCloud', file: path.join(DATA_DIR, 'AzureCloud.json') },
  { cloud: 'AzureChinaCloud', file: path.join(DATA_DIR, 'AzureChinaCloud.json') },
  { cloud: 'AzureUSGovernment', file: path.join(DATA_DIR, 'AzureUSGovernment.json') }
];

/**
 * Generate lightweight service tags index for a single cloud
 * Contains only metadata, not the full IP address lists
 */
function generateServiceTagsIndexForCloud(data: AzureCloudData, cloud: CloudName): ServiceTagIndex[] {
  const serviceTags: ServiceTagIndex[] = data.values.map(tag => ({
    id: tag.name,
    systemService: tag.properties.systemService || '',
    region: tag.properties.region || '',
    prefixCount: tag.properties.addressPrefixes?.length || 0,
    cloud
  }));

  return serviceTags;
}

/**
 * Generate regions index for a single cloud with aggregated statistics
 */
function generateRegionsIndexForCloud(data: AzureCloudData, cloud: CloudName): RegionIndex[] {
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
      prefixCount: stats.prefixCount,
      cloud
    }))
    .sort((a, b) => a.region.localeCompare(b.region));

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

  // Check if all cloud files exist
  for (const { cloud, file } of CLOUD_FILES) {
    if (!fs.existsSync(file)) {
      console.error(`ERROR: ${cloud} data file not found: ${file}`);
      console.error('Please run: npm run update-ip-data');
      process.exit(1);
    }
  }

  try {
    const allServiceTags: ServiceTagIndex[] = [];
    const allRegions: RegionIndex[] = [];
    let totalOriginalSize = 0;

    // Process each cloud file
    for (const { cloud, file } of CLOUD_FILES) {
      console.log(`Processing ${cloud}...`);
      const originalData = fs.readFileSync(file, 'utf8');
      const data = JSON.parse(originalData) as AzureCloudData;
      totalOriginalSize += Buffer.byteLength(originalData, 'utf8');

      const serviceTags = generateServiceTagsIndexForCloud(data, cloud);
      const regions = generateRegionsIndexForCloud(data, cloud);

      allServiceTags.push(...serviceTags);
      allRegions.push(...regions);

      console.log(`  ✓ ${cloud}: ${serviceTags.length} service tags, ${regions.length} regions\n`);
    }

    // Sort combined results
    allServiceTags.sort((a, b) => a.id.localeCompare(b.id));
    allRegions.sort((a, b) => a.region.localeCompare(b.region) || a.cloud.localeCompare(b.cloud));

    // Write service tags index
    console.log('Writing service tags index...');
    const serviceTagsJson = JSON.stringify(allServiceTags, null, 2);
    fs.writeFileSync(SERVICE_TAGS_INDEX, serviceTagsJson, 'utf8');
    const serviceTagsSize = Buffer.byteLength(serviceTagsJson, 'utf8');
    console.log(`  Saved to: ${SERVICE_TAGS_INDEX}`);
    console.log(`  Size: ${(serviceTagsSize / 1024).toFixed(1)} KB (${calculateSizeReduction(totalOriginalSize, serviceTagsSize)} smaller)\n`);

    // Write regions index
    console.log('Writing regions index...');
    const regionsJson = JSON.stringify(allRegions, null, 2);
    fs.writeFileSync(REGIONS_INDEX, regionsJson, 'utf8');
    const regionsSize = Buffer.byteLength(regionsJson, 'utf8');
    console.log(`  Saved to: ${REGIONS_INDEX}`);
    console.log(`  Size: ${(regionsSize / 1024).toFixed(1)} KB (${calculateSizeReduction(totalOriginalSize, regionsSize)} smaller)\n`);

    console.log('IP data indexes generation completed!\n');
    console.log('Summary:');
    console.log(`  Total original files: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Service tags index: ${(serviceTagsSize / 1024).toFixed(1)} KB (${allServiceTags.length} entries)`);
    console.log(`  Regions index: ${(regionsSize / 1024).toFixed(1)} KB (${allRegions.length} entries)`);
    console.log('\nClouds included: AzureCloud, AzureChinaCloud, AzureUSGovernment');

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

export { generateServiceTagsIndexForCloud, generateRegionsIndexForCloud };
