import { describe, it, expect } from 'vitest';
import {
  buildIpLookupIndex,
  lookupIpInIndex,
  prepareIpLookupIndex,
  searchIpIndex,
  IP_LOOKUP_INDEX_VERSION,
  type ServiceTagCloudDocument
} from './ipLookupIndex';

const clouds: ServiceTagCloudDocument[] = [
  {
    cloud: 'AzureCloud',
    values: [
      {
        name: 'Storage.WestEurope',
        properties: {
          systemService: 'AzureStorage',
          region: 'westeurope',
          regionId: 18,
          networkFeatures: ['API', 'NSG'],
          addressPrefixes: ['20.60.0.0/16', '20.60.128.0/17', '2603:1020:200::/56']
        }
      },
      {
        name: 'Storage',
        properties: {
          systemService: 'AzureStorage',
          addressPrefixes: ['20.60.0.0/16', '52.239.0.0/17']
        }
      },
      {
        name: 'ActionGroup',
        properties: {
          systemService: 'ActionGroup',
          addressPrefixes: ['13.66.60.119/32', 'not-a-cidr']
        }
      },
      { name: 'Empty', properties: { addressPrefixes: [] } }
    ]
  },
  {
    cloud: 'AzureChinaCloud',
    values: [
      {
        name: 'Storage.ChinaEast',
        properties: { systemService: 'AzureStorage', region: 'chinaeast', addressPrefixes: ['42.159.4.0/22'] }
      }
    ]
  }
];

const { index: file, stats } = buildIpLookupIndex(clouds);
const index = prepareIpLookupIndex(file);

describe('buildIpLookupIndex', () => {
  it('stores parallel start/prefix/meta arrays sorted by start', () => {
    expect(file.version).toBe(IP_LOOKUP_INDEX_VERSION);
    expect(stats).toEqual({ meta: 4, ipv4: 6, ipv6: 1, skipped: 1 });
    expect(file.ipv4Start.length).toBe(file.ipv4Prefix.length);
    expect(file.ipv4Start.length).toBe(file.ipv4Meta.length);
    expect([...file.ipv4Start]).toEqual([...file.ipv4Start].sort((a, b) => a - b));
  });

  it('dedupes metadata per cloud, tag and region', () => {
    expect(file.meta.map((m) => `${m.c}:${m.t}`)).toEqual([
      'AzureCloud:Storage.WestEurope',
      'AzureCloud:Storage',
      'AzureCloud:ActionGroup',
      'AzureChinaCloud:Storage.ChinaEast'
    ]);
    expect(file.meta[0]).toMatchObject({ r: 'westeurope', ri: '18', n: 'API, NSG' });
  });
});

describe('prepareIpLookupIndex', () => {
  it('derives range ends and scan bounds', () => {
    expect(index.v4MaxSpan).toBe(0xffff);
    expect(index.v6MinPrefix).toBe(56);
    expect(index.v6End[0]).toBe('26031020020000ffffffffffffffffff');
  });

  it('rejects other versions', () => {
    expect(() => prepareIpLookupIndex({ ...file, version: 1 as never })).toThrow(/version 1/);
  });
});

describe('lookupIpInIndex', () => {
  it('returns every range containing an IPv4 address, with CIDRs regenerated', () => {
    const results = lookupIpInIndex(index, '20.60.200.1');
    expect(results.map((r) => `${r.serviceTagId} ${r.ipAddressPrefix}`).sort()).toEqual([
      'Storage 20.60.0.0/16',
      'Storage.WestEurope 20.60.0.0/16',
      'Storage.WestEurope 20.60.128.0/17'
    ]);
    expect(results[0]).toMatchObject({ cloud: 'AzureCloud', systemService: 'AzureStorage' });
  });

  it('matches a /32 exactly and nothing next to it', () => {
    expect(lookupIpInIndex(index, '13.66.60.119').map((r) => r.serviceTagId)).toEqual(['ActionGroup']);
    expect(lookupIpInIndex(index, '13.66.60.120')).toEqual([]);
  });

  it('only returns ranges that fully contain a queried CIDR', () => {
    expect(lookupIpInIndex(index, '20.60.128.0/18').map((r) => r.ipAddressPrefix).sort()).toEqual([
      '20.60.0.0/16',
      '20.60.0.0/16',
      '20.60.128.0/17'
    ]);
    expect(lookupIpInIndex(index, '20.60.0.0/15')).toEqual([]);
  });

  it('handles IPv6 addresses and blocks', () => {
    expect(lookupIpInIndex(index, '2603:1020:200:ff::1').map((r) => r.ipAddressPrefix)).toEqual(['2603:1020:200::/56']);
    expect(lookupIpInIndex(index, '2603:1020:200::/64').map((r) => r.ipAddressPrefix)).toEqual(['2603:1020:200::/56']);
    expect(lookupIpInIndex(index, '2603:1020:300::1')).toEqual([]);
  });

  it('spans clouds', () => {
    expect(lookupIpInIndex(index, '42.159.5.1')[0]).toMatchObject({
      serviceTagId: 'Storage.ChinaEast',
      cloud: 'AzureChinaCloud',
      ipAddressPrefix: '42.159.4.0/22'
    });
  });
});

describe('searchIpIndex', () => {
  it('returns nothing without a filter', () => {
    expect(searchIpIndex(index, {})).toEqual([]);
  });

  it('filters by region across address families', () => {
    const results = searchIpIndex(index, { region: 'West Europe' });
    expect(results.map((r) => r.ipAddressPrefix).sort()).toEqual([
      '20.60.0.0/16',
      '20.60.128.0/17',
      '2603:1020:200::/56'
    ]);
  });

  it('matches a service by system service or tag id', () => {
    expect(searchIpIndex(index, { service: 'storage' }).length).toBe(6);
    expect(searchIpIndex(index, { service: 'actiongroup' }).map((r) => r.ipAddressPrefix)).toEqual(['13.66.60.119/32']);
  });

  it('applies region and service together', () => {
    expect(searchIpIndex(index, { region: 'chinaeast', service: 'storage' }).length).toBe(1);
    expect(searchIpIndex(index, { region: 'chinaeast', service: 'actiongroup' })).toEqual([]);
  });
});
