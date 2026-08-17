import { describe, it, expect } from 'vitest';
import {
  subnetAddressCount,
  subnetLastAddress,
  subnetNetmask,
  usableRange,
  hostCapacity,
  usableRangeAzure,
  hostCapacityAzure,
  usableRangeByType,
  hostCapacityByType
} from './subnetMath';
import { inetAtov, inetNtoa, prefixToMask } from './ipUtils';
import { NetworkType } from './types';

const ip = (value: string) => inetAtov(value) as number;

describe('subnetAddressCount', () => {
  it('is 2^(32-prefix)', () => {
    expect(subnetAddressCount(32)).toBe(1);
    expect(subnetAddressCount(24)).toBe(256);
    expect(subnetAddressCount(0)).toBe(4294967296);
  });

  it('rejects out-of-range prefixes', () => {
    expect(() => subnetAddressCount(-1)).toThrow();
    expect(() => subnetAddressCount(33)).toThrow();
  });
});

describe('subnetNetmask', () => {
  it('agrees with prefixToMask across every prefix', () => {
    for (let prefix = 0; prefix <= 32; prefix++) {
      expect(subnetNetmask(prefix)).toBe(prefixToMask(prefix));
    }
  });

  it('renders the familiar masks', () => {
    expect(inetNtoa(subnetNetmask(24))).toBe('255.255.255.0');
    expect(inetNtoa(subnetNetmask(16))).toBe('255.255.0.0');
    expect(inetNtoa(subnetNetmask(0))).toBe('0.0.0.0');
  });
});

describe('subnetLastAddress', () => {
  it('is the broadcast address', () => {
    expect(inetNtoa(subnetLastAddress(ip('192.168.1.0'), 24))).toBe('192.168.1.255');
    expect(inetNtoa(subnetLastAddress(ip('10.0.0.0'), 8))).toBe('10.255.255.255');
  });

  it('does not overflow at the top of the space', () => {
    expect(subnetLastAddress(ip('255.255.255.255'), 32)).toBe(ip('255.255.255.255'));
  });
});

describe('usableRange / hostCapacity (RFC)', () => {
  it('excludes network and broadcast for normal subnets', () => {
    const range = usableRange(ip('192.168.1.0'), 24);
    expect(inetNtoa(range.first)).toBe('192.168.1.1');
    expect(inetNtoa(range.last)).toBe('192.168.1.254');
    expect(hostCapacity(24)).toBe(254);
  });

  it('treats /31 and /32 per RFC 3021', () => {
    expect(hostCapacity(31)).toBe(2);
    expect(hostCapacity(32)).toBe(1);

    const p31 = usableRange(ip('192.168.1.0'), 31);
    expect(inetNtoa(p31.first)).toBe('192.168.1.0');
    expect(inetNtoa(p31.last)).toBe('192.168.1.1');
  });

  it('keeps capacity consistent with the range width', () => {
    for (const prefix of [8, 16, 22, 24, 29, 30]) {
      const range = usableRange(ip('10.0.0.0'), prefix);
      expect(range.last - range.first + 1).toBe(hostCapacity(prefix));
    }
  });
});

describe('usableRangeAzure / hostCapacityAzure', () => {
  it('reserves the first four addresses and the broadcast', () => {
    const range = usableRangeAzure(ip('10.0.0.0'), 24);
    expect(range).not.toBeNull();
    expect(inetNtoa(range!.first)).toBe('10.0.0.4');
    expect(inetNtoa(range!.last)).toBe('10.0.0.254');
    expect(hostCapacityAzure(24)).toBe(251);
  });

  it('makes /29 the smallest usable subnet', () => {
    expect(hostCapacityAzure(29)).toBe(3);
    expect(usableRangeAzure(ip('10.0.0.0'), 29)).not.toBeNull();

    expect(hostCapacityAzure(30)).toBe(0);
    expect(usableRangeAzure(ip('10.0.0.0'), 30)).toBeNull();
    expect(usableRangeAzure(ip('10.0.0.0'), 32)).toBeNull();
  });

  it('keeps capacity consistent with the range width', () => {
    for (const prefix of [8, 16, 24, 28, 29]) {
      const range = usableRangeAzure(ip('10.0.0.0'), prefix);
      expect(range!.last - range!.first + 1).toBe(hostCapacityAzure(prefix));
    }
  });
});

describe('*ByType dispatch', () => {
  it('uses RFC rules for VNets', () => {
    expect(hostCapacityByType(24, NetworkType.VNET)).toBe(hostCapacity(24));
    expect(usableRangeByType(ip('10.0.0.0'), 24, NetworkType.VNET)).toEqual(
      usableRange(ip('10.0.0.0'), 24)
    );
  });

  it('uses Azure rules for subnets and, defensively, for unassigned', () => {
    expect(hostCapacityByType(24, NetworkType.SUBNET)).toBe(hostCapacityAzure(24));
    expect(hostCapacityByType(24, NetworkType.UNASSIGNED)).toBe(hostCapacityAzure(24));
    expect(hostCapacityByType(24)).toBe(hostCapacityAzure(24));
  });
});
