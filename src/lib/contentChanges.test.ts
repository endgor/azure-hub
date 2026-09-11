import { describe, it, expect } from 'vitest';
import {
  buildServiceTagFingerprints,
  buildVmSkuFingerprints,
  fingerprintServiceTag,
  fingerprintVmSku,
  getChangedPaths,
  mergeManifest,
  serializeManifest,
  type ContentChangesManifest
} from './contentChanges';

const REGIONS = [
  { region: 'westeurope', prices: { Standard_D2s_v5: [0.1, 0.02], Standard_B1s: [0.01] } },
  { region: 'eastus', prices: { Standard_D2s_v5: [0.09, null, 0.03] } }
];
const CATALOG = ['Standard_D2s_v5', 'Standard_B1s', 'Standard_Unpriced'];

const CLOUDS = [
  {
    cloud: 'AzureCloud',
    values: [
      { name: 'Storage', properties: { addressPrefixes: ['10.0.0.0/8', '10.1.0.0/16'] } },
      { name: 'Storage.WestEurope', properties: { addressPrefixes: ['10.1.0.0/16'] } }
    ]
  },
  { cloud: 'AzureChinaCloud', values: [{ name: 'Storage', properties: { addressPrefixes: ['40.0.0.0/8'] } }] }
];
const TAG_INDEX = ['Storage', 'Storage', 'Storage.WestEurope', 'Sql'];

describe('fingerprints', () => {
  it('ignores region order for SKUs', () => {
    const a = fingerprintVmSku([['westeurope', [0.1]], ['eastus', [0.2]]]);
    const b = fingerprintVmSku([['eastus', [0.2]], ['westeurope', [0.1]]]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{12}$/);
  });

  it('changes when any price field changes, spot included', () => {
    const base = fingerprintVmSku([['westeurope', [0.1, 0.02]]]);
    expect(fingerprintVmSku([['westeurope', [0.1, 0.03]]])).not.toBe(base);
    expect(fingerprintVmSku([['westeurope', [0.1, 0.02, null]]])).not.toBe(base);
  });

  it('de-duplicates and sorts service tag prefixes across clouds', () => {
    const a = fingerprintServiceTag([
      { cloud: 'AzureCloud', prefixes: ['10.0.0.0/8', '10.1.0.0/16'] },
      { cloud: 'AzureCloud', prefixes: ['10.1.0.0/16'] }
    ]);
    const b = fingerprintServiceTag([{ cloud: 'AzureCloud', prefixes: ['10.1.0.0/16', '10.0.0.0/8'] }]);
    expect(a).toBe(b);
    expect(fingerprintServiceTag([{ cloud: 'AzureChinaCloud', prefixes: ['10.0.0.0/8', '10.1.0.0/16'] }])).not.toBe(a);
  });

  it('only fingerprints catalogued SKUs with at least one price', () => {
    expect(Object.keys(buildVmSkuFingerprints(CATALOG, REGIONS)).sort()).toEqual(['Standard_B1s', 'Standard_D2s_v5']);
  });

  it('excludes regional service tag variants', () => {
    const result = buildServiceTagFingerprints(TAG_INDEX, CLOUDS);
    expect(Object.keys(result).sort()).toEqual(['Sql', 'Storage']);
  });
});

describe('mergeManifest', () => {
  const current = {
    vmSkus: buildVmSkuFingerprints(CATALOG, REGIONS),
    serviceTags: buildServiceTagFingerprints(TAG_INDEX, CLOUDS)
  };

  it('bootstraps every entry with today on first run', () => {
    const manifest = mergeManifest(null, current, '2026-09-01');
    expect(manifest.lastRun).toBe('2026-09-01');
    expect(manifest.vmSkus.Standard_D2s_v5.lastmod).toBe('2026-09-01');
    expect(manifest.serviceTags.Storage.lastmod).toBe('2026-09-01');
  });

  it('keeps lastmod when data is unchanged and produces identical output', () => {
    const first = mergeManifest(null, current, '2026-09-01');
    const second = mergeManifest(first, current, '2026-09-02');
    expect(second.vmSkus.Standard_D2s_v5.lastmod).toBe('2026-09-01');
    expect(second.serviceTags.Storage.lastmod).toBe('2026-09-01');
    expect(getChangedPaths(second)).toEqual([]);

    const third = mergeManifest(second, current, '2026-09-02');
    expect(serializeManifest(third)).toBe(serializeManifest(second));
  });

  it('bumps lastmod when prices change and drops removed keys', () => {
    const first = mergeManifest(null, current, '2026-09-01');
    const changedRegions = [
      { region: 'westeurope', prices: { Standard_D2s_v5: [0.11, 0.02] } },
      { region: 'eastus', prices: { Standard_D2s_v5: [0.09, null, 0.03] } }
    ];
    const next = mergeManifest(
      first,
      { vmSkus: buildVmSkuFingerprints(CATALOG, changedRegions), serviceTags: current.serviceTags },
      '2026-09-05'
    );
    expect(next.vmSkus.Standard_D2s_v5.lastmod).toBe('2026-09-05');
    expect(next.vmSkus.Standard_B1s).toBeUndefined();
    expect(getChangedPaths(next)).toEqual(['/tools/vm-pricing/Standard_D2s_v5/']);
  });
});

describe('getChangedPaths', () => {
  it('maps changed entries to encoded site paths and never emits regional tags', () => {
    const manifest: ContentChangesManifest = {
      lastRun: '2026-09-11',
      vmSkus: {
        'Standard_M416-208s_v2': { fingerprint: 'a', lastmod: '2026-09-11' },
        Standard_B1s: { fingerprint: 'b', lastmod: '2026-09-01' }
      },
      serviceTags: {
        Storage: { fingerprint: 'c', lastmod: '2026-09-11' },
        'Storage.WestEurope': { fingerprint: 'd', lastmod: '2026-09-11' }
      }
    };
    expect(getChangedPaths(manifest)).toEqual([
      '/tools/service-tags/Storage/',
      `/tools/vm-pricing/${encodeURIComponent('Standard_M416-208s_v2')}/`
    ]);
  });
});
