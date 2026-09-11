import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cachedJson, clearCachedJson } from './cachedJson';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('cachedJson', () => {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>();

  beforeEach(() => {
    clearCachedJson();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fetches once and serves later calls from memory', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ a: 1 }));

    expect(await cachedJson<{ a: number }>('/data/x.json')).toEqual({ a: 1 });
    expect(await cachedJson<{ a: number }>('/data/x.json')).toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent requests for the same URL into one fetch', async () => {
    fetchMock.mockImplementation(async () => jsonResponse([1, 2, 3]));

    const [a, b] = await Promise.all([cachedJson<number[]>('/data/y.json'), cachedJson<number[]>('/data/y.json')]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL expires', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(jsonResponse('old')).mockResolvedValueOnce(jsonResponse('new'));

    expect(await cachedJson<string>('/data/z.json', { ttlMs: 1000 })).toBe('old');
    vi.advanceTimersByTime(1001);
    expect(await cachedJson<string>('/data/z.json', { ttlMs: 1000 })).toBe('new');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on HTTP errors and does not cache them', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 500)).mockResolvedValueOnce(jsonResponse('ok'));

    await expect(cachedJson('/data/e.json')).rejects.toThrow(/500/);
    expect(await cachedJson<string>('/data/e.json')).toBe('ok');
  });

  it('treats 404 as null when allowed, and remembers the miss', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, 404));

    expect(await cachedJson<string>('/data/missing.json', { allowNotFound: true })).toBeNull();
    expect(await cachedJson<string>('/data/missing.json', { allowNotFound: true })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still throws on 404 when not allowed', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, 404));
    await expect(cachedJson('/data/missing.json')).rejects.toThrow(/404/);
  });
});
