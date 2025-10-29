import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';

interface TenantLookupResponse {
  input: { domain: string };
  tenant: {
    tenantId: string;
    defaultDomainName?: string;
    displayName?: string;
    federationBrandName?: string | null;
  };
  metadata?: {
    cloud_instance_name?: string;
    tenant_region_scope?: string;
    tenant_region_sub_scope?: string;
    authorization_endpoint?: string;
    issuer?: string;
    [key: string]: unknown;
  };
  derived: {
    azureAdInstance?: string;
    tenantScope?: string;
  };
  fetchedAt: string;
}

interface TenantHistoryEntry {
  domain: string;
  tenantId: string;
  timestamp: string;
}

const HISTORY_STORAGE_KEY = 'azurehub:tenantLookupHistory:v1';

const rawTenantLookupBase = process.env.NEXT_PUBLIC_TENANT_LOOKUP_API_BASE?.trim();
const TENANT_LOOKUP_ENDPOINT = rawTenantLookupBase && rawTenantLookupBase.length > 0
  ? `${rawTenantLookupBase.replace(/\/+$/, '')}/api/tenantLookup`
  : '/api/tenantLookup';

const domainRegex =
  /^(?=.{1,255}$)(?!-)(?:[a-z0-9-]{0,62}[a-z0-9]\.)+[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i;

export default function TenantLookupPage() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<TenantLookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TenantHistoryEntry[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TenantHistoryEntry[];
        setHistory(parsed);
      }
    } catch {
      // Ignore storage parsing issues
    }
  }, []);

  const persistHistory = useCallback((entry: TenantHistoryEntry) => {
    setHistory((prev) => {
      const existing = prev.filter((item) => item.domain !== entry.domain);
      const updated = [entry, ...existing].slice(0, 6);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
    setHistory([]);
  }, []);

  const handleLookup = useCallback(
    async (lookupDomain: string) => {
      const normalized = lookupDomain.trim().toLowerCase();
      if (!normalized || !domainRegex.test(normalized)) {
        setError('Enter a valid domain such as contoso.com.');
        setResult(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(TENANT_LOOKUP_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ domain: normalized }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setResult(null);
          setError(payload?.message || payload?.error || 'Tenant lookup failed. Please try again.');
          return;
        }

        setResult(payload as TenantLookupResponse);
        persistHistory({
          domain: normalized,
          tenantId: payload?.tenant?.tenantId ?? '',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred.';
        setError(message);
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    [persistHistory]
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleLookup(domain);
  };

  const summaryFields = useMemo(() => {
    if (!result) return [];
    return [
      {
        label: 'Tenant Name',
        value: result.input.domain,
      },
      {
        label: 'Tenant GUID',
        value: result.tenant.tenantId,
      },
      {
        label: 'Azure AD Instance',
        value: result.derived.azureAdInstance ?? 'Unknown',
      },
      {
        label: 'Tenant Scope',
        value: result.derived.tenantScope ?? 'Not applicable',
      },
    ];
  }, [result]);

  return (
    <Layout
      title="Tenant Lookup"
      description="Find Microsoft Entra tenant IDs, default domains, and cloud instances from any verified domain with the Azure Hub tenant lookup tool."
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 md:tracking-[0.3em]">Identity</p>
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl lg:text-4xl">Tenant Lookup</h1>
        </div>

        <form onSubmit={onSubmit} role="search" aria-label="Tenant lookup" className="w-full max-w-md">
          <label className="sr-only" htmlFor="tenant-domain">
            Enter a tenant-verified domain name
          </label>
          <div className="relative">
            <input
              id="tenant-domain"
              type="search"
              inputMode="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              placeholder="Enter tenant domain (contoso.com)"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-sky-500 transition hover:text-sky-700 disabled:cursor-not-allowed"
              disabled={isLoading}
              aria-label="Run tenant lookup"
            >
              {isLoading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-500/60 border-t-transparent" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21 21l-4.8-4.8m0 0A6 6 0 1010 16a6 6 0 006.2-4.6z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
            <h2 className="font-semibold text-rose-800">Lookup failed</h2>
            <p className="mt-1 text-rose-700">{error}</p>
          </div>
        )}

        {result && !error && summaryFields.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Lookup Results</h2>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                {new Date(result.fetchedAt).toLocaleTimeString()}
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {summaryFields.map((field) => (
                <div
                  key={field.label}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {field.label}
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-900 break-all">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <h3 className="text-base font-semibold text-slate-900">Recent lookups</h3>
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs font-semibold text-slate-500 underline decoration-dotted hover:text-slate-700"
              >
                Clear
              </button>
            </div>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm text-slate-600">
              {history.map((entry) => (
                <li
                  key={entry.domain}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDomain(entry.domain);
                        void handleLookup(entry.domain);
                      }}
                      className="text-sm font-semibold text-slate-900 underline decoration-dotted underline-offset-4 hover:text-sky-600"
                    >
                      {entry.domain}
                    </button>
                    <span className="text-xs text-slate-500">
                      Tenant ID:{' '}
                      <span className="font-mono text-[11px] tracking-tight">
                        {entry.tenantId || 'unknown'}
                      </span>
                    </span>
                  </div>
                  <time className="text-xs text-slate-500" dateTime={entry.timestamp}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </Layout>
  );
}
