import { describe, it, expect } from 'vitest';
import { inetAtov, inetNtoa, prefixToMask, normaliseNetwork, isRfc1918Cidr } from './ipUtils';

describe('inetAtov', () => {
  it('parses valid addresses', () => {
    expect(inetAtov('0.0.0.0')).toBe(0);
    expect(inetAtov('192.168.1.1')).toBe(3232235777);
    expect(inetAtov('255.255.255.255')).toBe(4294967295);
  });

  it('tolerates surrounding whitespace', () => {
    expect(inetAtov('  10.0.0.1  ')).toBe(inetAtov('10.0.0.1'));
  });

  it('rejects malformed input', () => {
    for (const bad of ['', '1.2.3', '1.2.3.4.5', '256.0.0.1', '1.2.3.-1', 'a.b.c.d', '01.02.03.0400', '1.2.3.4/24']) {
      expect(inetAtov(bad)).toBeNull();
    }
  });
});

describe('inetNtoa', () => {
  it('round-trips with inetAtov', () => {
    for (const address of ['0.0.0.0', '10.0.0.1', '172.16.254.1', '192.168.1.1', '255.255.255.255']) {
      expect(inetNtoa(inetAtov(address) as number)).toBe(address);
    }
  });
});

describe('prefixToMask', () => {
  it('produces the expected masks', () => {
    expect(inetNtoa(prefixToMask(0))).toBe('0.0.0.0');
    expect(inetNtoa(prefixToMask(8))).toBe('255.0.0.0');
    expect(inetNtoa(prefixToMask(24))).toBe('255.255.255.0');
    expect(inetNtoa(prefixToMask(32))).toBe('255.255.255.255');
  });

  it('is monotonically wider as the prefix shrinks', () => {
    for (let prefix = 1; prefix <= 32; prefix++) {
      expect(prefixToMask(prefix) >>> 0).toBeGreaterThan(prefixToMask(prefix - 1) >>> 0);
    }
  });
});

describe('normaliseNetwork', () => {
  it('clears the host bits', () => {
    expect(inetNtoa(normaliseNetwork(inetAtov('192.168.1.130') as number, 24))).toBe('192.168.1.0');
    expect(inetNtoa(normaliseNetwork(inetAtov('10.5.6.7') as number, 8))).toBe('10.0.0.0');
  });

  it('leaves an already-normalised address alone', () => {
    const network = inetAtov('192.168.0.0') as number;
    expect(normaliseNetwork(network, 16)).toBe(network);
  });
});

describe('isRfc1918Cidr', () => {
  const check = (cidr: string) => {
    const [address, prefix] = cidr.split('/');
    const prefixLen = Number(prefix);
    return isRfc1918Cidr(normaliseNetwork(inetAtov(address) as number, prefixLen), prefixLen);
  };

  it('accepts blocks inside the private ranges', () => {
    for (const cidr of ['10.0.0.0/8', '10.1.2.0/24', '172.16.0.0/12', '172.31.255.0/24', '192.168.0.0/16', '192.168.1.0/24']) {
      expect(check(cidr), cidr).toBe(true);
    }
  });

  it('rejects public blocks', () => {
    for (const cidr of ['8.8.8.0/24', '11.0.0.0/8', '172.15.0.0/16', '172.32.0.0/16', '192.167.0.0/16', '192.169.0.0/16']) {
      expect(check(cidr), cidr).toBe(false);
    }
  });

  // A prefix shorter than the containing range would spill outside it.
  it('rejects blocks that extend beyond a private range', () => {
    expect(check('10.0.0.0/7')).toBe(false);
    expect(check('172.16.0.0/11')).toBe(false);
    expect(check('192.168.0.0/15')).toBe(false);
    expect(check('0.0.0.0/0')).toBe(false);
  });
});
