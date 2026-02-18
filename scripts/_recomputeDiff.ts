import * as fs from 'fs';
import * as path from 'path';
import { computeIpDiff, mergeDiffs } from './computeIpDiff';
import type { IpDiffFile } from '../src/types/ipDiff';
import type { AzureServiceTagsRoot, AzureCloudName, AzureFileMetadata } from '../src/types/azure';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const clouds: AzureCloudName[] = ['AzureCloud' as AzureCloudName, 'AzureChinaCloud' as AzureCloudName, 'AzureUSGovernment' as AzureCloudName];
const diffs: IpDiffFile[] = [];
const metadata: AzureFileMetadata[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'file-metadata.json'), 'utf8'));

for (const cloud of clouds) {
  const curr = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${cloud}.json`), 'utf8')) as AzureServiceTagsRoot;
  const prev = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${cloud}-previous.json`), 'utf8')) as AzureServiceTagsRoot;

  if (curr.changeNumber !== prev.changeNumber) {
    const cloudMeta = metadata.find((m: AzureFileMetadata) => m.cloud === cloud);
    const diff = computeIpDiff({
      previousData: prev,
      currentData: curr,
      previousFilename: cloudMeta?.previousFilename || 'unknown.json',
      currentFilename: cloudMeta?.filename || 'unknown.json',
      cloud,
    });
    diffs.push(diff);
    console.log(`${cloud}: +${diff.meta.summary.totalPrefixesAdded} -${diff.meta.summary.totalPrefixesRemoved}`);
  } else {
    console.log(`${cloud}: no changes`);
  }
}

const merged = mergeDiffs(diffs);
fs.writeFileSync(path.join(DATA_DIR, 'ip-diff.json'), JSON.stringify(merged, null, 2), 'utf8');
console.log(`Wrote ip-diff.json with ${diffs.length} cloud(s)`);
