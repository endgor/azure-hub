import { describe, expect, it } from 'vitest';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { buildAssertion, dateRange, parseArgs, sampleEvenly, toAggregates } from './gscStats';

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

describe('parseArgs', () => {
  it('defaults to a 28-day window on the apex site', () => {
    const opts = parseArgs([]);
    expect(opts.days).toBe(28);
    expect(opts.site).toBe('https://azurehub.org/');
    expect(opts.json).toBe(false);
    expect(opts.inspect).toEqual([]);
  });

  it('reads valued and bare flags', () => {
    const opts = parseArgs(['--days', '90', '--queries', '40', '--json', '--pages']);
    expect(opts.days).toBe(90);
    expect(opts.queries).toBe(40);
    expect(opts.json).toBe(true);
    expect(opts.pages).toBe(25);
  });

  it('collects every URL after --inspect', () => {
    const opts = parseArgs(['--inspect', '/a', '/b', '/c', '--json']);
    expect(opts.inspect).toEqual(['/a', '/b', '/c']);
    expect(opts.json).toBe(true);
  });

  it('rejects unknown arguments and missing values', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/Unknown argument/);
    expect(() => parseArgs(['--page'])).toThrow(/--page needs/);
  });
});

describe('dateRange', () => {
  it('ends three days back to clear Google reporting lag', () => {
    const { startDate, endDate } = dateRange(28, new Date('2026-09-18T00:00:00Z'));
    expect(endDate).toBe('2026-09-15');
    expect(startDate).toBe('2026-08-19');
  });

  it('spans exactly the requested number of days', () => {
    const { startDate, endDate } = dateRange(7, new Date('2026-09-18T00:00:00Z'));
    const days = (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1;
    expect(days).toBe(7);
  });
});

describe('toAggregates', () => {
  it('sorts by clicks, then impressions', () => {
    const rows = [
      { keys: ['low'], clicks: 1, impressions: 500, ctr: 0.002, position: 9 },
      { keys: ['high'], clicks: 10, impressions: 20, ctr: 0.5, position: 2 },
      { keys: ['tie'], clicks: 1, impressions: 900, ctr: 0.001, position: 7 },
    ];
    expect(toAggregates(rows).map((row) => row.key)).toEqual(['high', 'tie', 'low']);
  });

  it('survives rows with no keys', () => {
    expect(toAggregates([{ clicks: 0, impressions: 0, ctr: 0, position: 0 }])[0].key).toBe('(unknown)');
  });
});

describe('sampleEvenly', () => {
  it('returns everything when the sample is larger than the set', () => {
    expect(sampleEvenly([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });

  it('spreads the sample across the whole set rather than taking the head', () => {
    const sample = sampleEvenly(Array.from({ length: 1000 }, (_, i) => i), 4);
    expect(sample).toEqual([0, 250, 500, 750]);
  });
});

describe('buildAssertion', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = {
    client_email: 'gsc@example.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };

  it('signs the header and claims with the service account key', () => {
    const [header, claims, signature] = buildAssertion(account, 1_800_000_000).split('.');
    const verifier = createVerify('RSA-SHA256').update(`${header}.${claims}`);
    const raw = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    expect(verifier.verify(privateKey, raw)).toBe(true);
  });

  it('claims the read-only Search Console scope for one hour', () => {
    const [header, claims] = buildAssertion(account, 1_800_000_000).split('.');
    expect(decodeSegment(header)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(decodeSegment(claims)).toEqual({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_800_000_000,
      exp: 1_800_003_600,
    });
  });
});
