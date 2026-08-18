import { describe, it, expect } from 'vitest';
import { isIPv6, ipv4ToUint32, expandIPv6, ipv6ToHex, cidrToRange } from './ipUtils';

describe('isIPv6', () => {
  it('distinguishes v6 from v4', () => {
    expect(isIPv6('2603:1030:9:348::')).toBe(true);
    expect(isIPv6('40.112.127.224')).toBe(false);
  });
});

describe('ipv4ToUint32', () => {
  it('converts to an unsigned integer', () => {
    expect(ipv4ToUint32('0.0.0.0')).toBe(0);
    expect(ipv4ToUint32('192.168.1.1')).toBe(3232235777);
  });

  it('does not sign-flip on the high bit', () => {
    expect(ipv4ToUint32('255.255.255.255')).toBe(4294967295);
    expect(ipv4ToUint32('224.0.0.1')).toBeGreaterThan(0);
  });
});

describe('expandIPv6', () => {
  it('expands :: to the missing zero groups', () => {
    expect(expandIPv6('2603:1030::1')).toBe('2603:1030:0000:0000:0000:0000:0000:0001');
    expect(expandIPv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
    expect(expandIPv6('::')).toBe('0000:0000:0000:0000:0000:0000:0000:0000');
  });

  it('pads an already-full address', () => {
    expect(expandIPv6('2603:1030:9:348:0:0:0:1')).toBe('2603:1030:0009:0348:0000:0000:0000:0001');
  });

  it('folds IPv4-mapped addresses into hex groups', () => {
    expect(expandIPv6('::ffff:192.168.1.1')).toBe('0000:0000:0000:0000:0000:ffff:c0a8:0101');
  });
});

describe('ipv6ToHex', () => {
  it('produces a fixed-width lowercase hex string', () => {
    const hex = ipv6ToHex('2603:1030:9:348::');
    expect(hex).toBe('26031030000903480000000000000000');
    expect(hex).toHaveLength(32);
  });

  // The lookup index binary-searches on these strings, so lexicographic
  // order must match numeric order.
  it('orders lexicographically the same way it orders numerically', () => {
    expect(ipv6ToHex('2603:1030:9:348::') < ipv6ToHex('2603:1030:9:349::')).toBe(true);
    expect(ipv6ToHex('2603:1030:9:9::') < ipv6ToHex('2603:1030:9:10::')).toBe(true);
  });
});

describe('cidrToRange', () => {
  it('covers the whole IPv4 block', () => {
    const range = cidrToRange('192.168.1.0/24');
    expect(range.isV6).toBe(false);
    expect(range.start).toBe(ipv4ToUint32('192.168.1.0'));
    expect(range.end).toBe(ipv4ToUint32('192.168.1.255'));
  });

  it('handles a single-host /32', () => {
    const range = cidrToRange('10.0.0.7/32');
    expect(range.start).toBe(range.end);
    expect(range.start).toBe(ipv4ToUint32('10.0.0.7'));
  });

  it('handles /0', () => {
    const range = cidrToRange('0.0.0.0/0');
    expect(range.start).toBe(0);
    expect(range.end).toBe(4294967295);
  });

  it('normalises a non-aligned prefix down to its network address', () => {
    const range = cidrToRange('192.168.1.130/24');
    expect(range.start).toBe(ipv4ToUint32('192.168.1.0'));
    expect(range.end).toBe(ipv4ToUint32('192.168.1.255'));
  });

  it('returns hex bounds for IPv6', () => {
    const range = cidrToRange('2603:1030:9:348::/64');
    expect(range.isV6).toBe(true);
    expect(range.start).toBe('26031030000903480000000000000000');
    expect(range.end).toBe('2603103000090348ffffffffffffffff');
  });
});
