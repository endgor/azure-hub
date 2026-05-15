import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { GetStaticProps } from 'next';
import Layout from '@/components/Layout';
import SearchInput from '@/components/shared/SearchInput';
import ErrorBox from '@/components/shared/ErrorBox';

export const getStaticProps: GetStaticProps = async () => {
  return { props: {} };
};

interface UserRealmResult {
  nameSpaceType: 'Managed' | 'Federated' | 'Unknown';
  federationProtocol?: string;
  federationBrandName?: string;
  cloudInstanceName?: string;
}

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
  userRealm?: UserRealmResult;
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

function getTenantLookupEndpoint(): string {
  const rawTenantLookupBase = process.env.NEXT_PUBLIC_TENANT_LOOKUP_API_BASE?.trim();

  if (!rawTenantLookupBase) {
    return '/api/tenantLookup';
  }

  try {
    const normalizedBase = new URL(rawTenantLookupBase);
    normalizedBase.pathname = normalizedBase.pathname.replace(/\/+$/, '') + '/api/tenantLookup';
    normalizedBase.search = '';
    normalizedBase.hash = '';
    return normalizedBase.toString();
  } catch {
    return '/api/tenantLookup';
  }
}

const TENANT_LOOKUP_ENDPOINT = getTenantLookupEndpoint();

const domainRegex =
  /^(?=.{1,255}$)(?!-)(?:[a-z0-9-]{0,62}[a-z0-9]\.)+[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i;

export default function TenantLookupPage() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<TenantLookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TenantHistoryEntry[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleCopy = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Clipboard API unavailable; silently ignore.
    }
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

  const performLookup = useCallback(() => {
    void handleLookup(domain);
  }, [domain, handleLookup]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    performLookup();
  };

  const summaryFields = useMemo(() => {
    if (!result) return [];

    const fields: { label: string; value: string; mono?: boolean }[] = [];

    if (result.tenant.displayName) {
      fields.push({ label: 'Display Name', value: result.tenant.displayName });
    }
    fields.push({ label: 'Domain', value: result.input.domain });
    fields.push({ label: 'Tenant ID', value: result.tenant.tenantId, mono: true });
    if (result.tenant.defaultDomainName) {
      fields.push({ label: 'Default Domain', value: result.tenant.defaultDomainName });
    }
    fields.push({ label: 'Azure AD Instance', value: result.derived.azureAdInstance ?? 'Unknown' });
    fields.push({
      label: 'Tenant Scope',
      value: result.derived.tenantScope ?? 'Not applicable',
    });
    if (result.userRealm && result.userRealm.nameSpaceType !== 'Unknown') {
      fields.push({ label: 'Authentication Type', value: result.userRealm.nameSpaceType });
      if (result.userRealm.federationProtocol) {
        fields.push({ label: 'Federation Protocol', value: result.userRealm.federationProtocol });
      }
    }
    if (result.metadata?.issuer) {
      fields.push({ label: 'Issuer', value: result.metadata.issuer });
    }

    return fields;
  }, [result]);

  return (
    <Layout
      title="Azure Tenant Lookup - Discover Tenant IDs & Metadata"
      description="Find Microsoft Entra tenant IDs, default domains, and cloud instances from any verified domain with the Azure Hub tenant lookup tool."
      keywords={[
        'azure tenant lookup',
        'tenant id lookup',
        'azure id lookup',
        'tenant domain lookup',
        'tenant lookup microsoft',
        'entra tenant lookup',
        'azure ad tenant id',
        'microsoft tenant discovery',
        'azure tenant id finder',
        'entra id tenant lookup'
      ]}
      breadcrumbs={[
        { name: 'Home', url: 'https://azurehub.org/' },
        { name: 'Tenant Lookup', url: 'https://azurehub.org/tools/tenant-lookup/' }
      ]}
      toolSchema={{
        name: 'Azure Tenant Lookup Tool',
        applicationCategory: 'DeveloperApplication',
        offers: { price: '0' }
      }}
    >
      <section className="space-y-10">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500/80 dark:text-blue-400 md:tracking-[0.3em]">Identity</p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">Azure Tenant Lookup</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Discover Azure AD tenant information from domain names. Retrieve tenant names, GUIDs, Azure AD instances, and tenant scope details.
          </p>
        </div>

        <form onSubmit={onSubmit} role="search" aria-label="Tenant lookup">
          <label className="sr-only" htmlFor="tenant-domain">
            Enter a tenant-verified domain name
          </label>
          <SearchInput
            id="tenant-domain"
            inputMode="email"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Enter tenant domain (contoso.com)"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            maxWidth="full"
            isLoading={isLoading}
            onIconClick={performLookup}
          />
        </form>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {error && (
              <ErrorBox title="Lookup failed">
                {error}
              </ErrorBox>
            )}

            {result && !error && summaryFields.length > 0 && (
              <div className="rounded-xl bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lookup results</h2>
                  <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                    {new Date(result.fetchedAt).toLocaleTimeString()}
                  </span>
                </div>
                <dl className="divide-y divide-slate-200/70 px-4 pb-2 dark:divide-slate-700/60">
                  {summaryFields.map((field) => (
                    <div key={field.label} className="group flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                      <dt className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:w-44">
                        {field.label}
                      </dt>
                      <dd className={`min-w-0 flex-1 break-all text-sm text-slate-900 dark:text-slate-100${field.mono ? ' font-mono' : ' font-medium'}`}>
                        {field.value}
                      </dd>
                      <button
                        type="button"
                        onClick={() => void handleCopy(field.label, field.value)}
                        aria-label={copiedField === field.label ? `${field.label} copied` : `Copy ${field.label}`}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center self-start rounded-md text-slate-400 opacity-60 transition hover:bg-slate-100 hover:text-slate-700 hover:opacity-100 group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 sm:self-auto"
                      >
                        {copiedField === field.label ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-emerald-500" aria-hidden="true">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {!error && !result && (
              <section className="rounded-xl bg-white dark:bg-slate-900">
                <div className="px-4 pt-4 pb-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Try an example</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Click any domain to look up its tenant.
                  </p>
                </div>
                <ul className="divide-y divide-slate-200/70 p-2 dark:divide-slate-700/60">
                  {EXAMPLE_DOMAINS.map((item) => (
                    <li key={item.domain}>
                      <button
                        type="button"
                        onClick={() => {
                          setDomain(item.domain);
                          void handleLookup(item.domain);
                        }}
                        className="group flex w-full items-center gap-4 rounded-md px-2 py-3.5 text-left transition hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                      >
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                          {item.icon}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {item.label}
                          </span>
                          <span className="break-all font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                            {item.domain}
                          </span>
                          <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {item.description}
                          </span>
                        </div>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 flex-shrink-0 -translate-x-2 text-slate-400 opacity-0 transition-all group-hover:translate-x-0 group-hover:text-blue-500 group-hover:opacity-100 dark:group-hover:text-blue-400"
                          aria-hidden="true"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl bg-white p-5 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">What you&apos;ll see</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                <li>Tenant ID (GUID) and display name</li>
                <li>Default <code className="font-mono text-[11px] text-slate-700 dark:text-slate-300">*.onmicrosoft.com</code> domain</li>
                <li>Cloud instance — Public, Government, or China</li>
                <li>Federation brand and protocol, when applicable</li>
                <li>OIDC issuer and authorization endpoint</li>
              </ul>
            </section>

            {history.length > 0 && (
              <section className="rounded-xl bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent lookups</h3>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                </div>
                <ul className="divide-y divide-slate-200/70 px-2 pb-2 dark:divide-slate-700/60">
                  {history.map((entry) => (
                    <li key={entry.domain}>
                      <button
                        type="button"
                        onClick={() => {
                          setDomain(entry.domain);
                          void handleLookup(entry.domain);
                        }}
                        className="group flex w-full flex-col gap-0.5 rounded-md px-2 py-2.5 text-left transition hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                      >
                        <span className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                          {entry.domain}
                        </span>
                        <span className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {entry.tenantId || 'unknown'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </section>
    </Layout>
  );
}

const EXAMPLE_DOMAINS = [
  {
    label: 'Microsoft Corp',
    domain: 'microsoft.com',
    description: 'Microsoft’s flagship Entra tenant — worldwide scope.',
    accent: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M3 21h18M5 21V7l7-4 7 4v14" />
        <path d="M9 10h.01M9 14h.01M9 18h.01M15 10h.01M15 14h.01M15 18h.01" />
      </svg>
    )
  },
  {
    label: 'GitHub',
    domain: 'github.com',
    description: 'Microsoft-owned developer platform with a distinct tenant.',
    accent: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16" />
      </svg>
    )
  },
  {
    label: 'NASA',
    domain: 'nasa.gov',
    description: 'Federal agency tenant — typically Azure Government scope.',
    accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M12 21s8-4 8-10V5l-8-3-8 3v6c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  }
];
