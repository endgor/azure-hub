import Link from 'next/link';
import type { GetStaticProps } from 'next';
import Layout from '@/components/Layout';
import fs from 'fs';
import path from 'path';

interface HomeProps {
  lastUpdated: string | null;
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  let lastUpdated: string | null = null;
  try {
    const metadataPath = path.join(process.cwd(), 'public', 'data', 'file-metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    if (Array.isArray(metadata) && metadata.length > 0) {
      lastUpdated = metadata[0].lastRetrieved ?? null;
    }
  } catch {
    // Metadata not available
  }
  return { props: { lastUpdated } };
};

const HERO_TOOL = {
  title: 'IP Lookup',
  description: 'Check if an IP address, CIDR range, or hostname belongs to Azure and see which service tags and regions it maps to.',
  href: '/tools/ip-lookup',
};

const TOOLS = [
  {
    title: 'Service Tags',
    description: 'Browse and search Azure service tags with IP ranges and diff tracking.',
    href: '/tools/service-tags',
    accent: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M3 4a2 2 0 012-2h4.586a2 2 0 011.414.586l8.414 8.414a2 2 0 010 2.828l-4.586 4.586a2 2 0 01-2.828 0L3.586 10.414A2 2 0 013 9V4zm4 3a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    ),
  },
  {
    title: 'Tenant Lookup',
    description: 'Discover tenant IDs, default domains, and region scope from any domain.',
    href: '/tools/tenant-lookup',
    accent: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M4 4a2 2 0 012-2h4a2 2 0 012 2v3h5a2 2 0 012 2v3h-2V9h-5v11h-2v-4H6v4H4V4zm4 0H6v5h4V4H8zm12 10a2 2 0 012 2v5h-2v-3h-4v3h-2v-5a2 2 0 012-2h4zm-1 2h-2v1h2v-1z" />
      </svg>
    ),
  },
  {
    title: 'Private DNS Zones',
    description: 'Look up which private DNS zones are needed for Azure Private Endpoints.',
    href: '/tools/private-dns-zones',
    accent: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 00-3.16 19.5A3 3 0 0112 19a3 3 0 013.16 2.5A10 10 0 0012 2zm0 2c.74 0 1.72 1.1 2.39 3H9.61C10.28 5.1 11.26 4 12 4zm-3.66 5h7.32a16.4 16.4 0 01.28 3H8.06a16.4 16.4 0 01.28-3zM4.07 9h3.16A18.5 18.5 0 007 12H4.06c.01-1.04.16-2.05.41-3h-.4zm0 5H7c.08 1.05.28 2.05.57 3H4.88A8 8 0 014.06 14zM12 18a1.5 1.5 0 00-1.42 1c.45.05.94.08 1.42.08s.97-.03 1.42-.08A1.5 1.5 0 0012 18zm4.43-1c.29-.95.49-1.95.57-3h2.94a8 8 0 01-.82 3h-2.69zM20 12h-2.94a18.5 18.5 0 00-.23-3h3.16c.25.95.41 1.96.41 3h-.4z" />
        <path d="M18 15a3 3 0 00-3 3v1h-.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h7a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5H21v-1a3 3 0 00-3-3zm-1.5 3a1.5 1.5 0 113 0v1h-3v-1z" />
      </svg>
    ),
  },
  {
    title: 'Subnet Calculator',
    description: 'Plan VNet address space, split subnets visually, and export for deployments.',
    href: '/tools/subnet-calculator',
    accent: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M5 3a2 2 0 00-2 2v5h18V5a2 2 0 00-2-2H5zm16 9H3v5a2 2 0 002 2h6v-3H9a1 1 0 110-2h6a1 1 0 010 2h-2v3h6a2 2 0 002-2v-5z" />
      </svg>
    ),
  },
  {
    title: 'Azure RBAC Calculator',
    description: 'Find the least-privileged role for any set of Azure resource actions.',
    href: '/tools/azure-rbac-calculator',
    accent: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
      </svg>
    ),
  },
  {
    title: 'Entra ID Roles',
    description: 'Find the least-privileged Entra ID role for directory operations.',
    href: '/tools/entraid-roles-calculator',
    accent: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
  },
] as const;

export default function Home({ lastUpdated }: HomeProps) {
  return (
    <Layout
      title="Azure Hub - IP Lookup, RBAC & Networking Tools"
      description="Azure Hub centralizes Azure IP lookup, tenant discovery, service tag exploration, and subnet planning tools for cloud engineers."
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl">
            Pick a tool and get to work.
          </h1>
          {lastUpdated && (
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              Data last updated {lastUpdated}
            </p>
          )}
        </div>

        {/* Hero — IP Lookup */}
        <Link
          href={HERO_TOOL.href}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 p-6 text-white shadow-lg shadow-sky-500/10 transition hover:shadow-xl hover:shadow-sky-500/20 dark:from-sky-700 dark:to-blue-800 md:flex-row md:items-center md:p-8"
        >
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />

          <div className="relative z-10 max-w-xl">
            <div className="mb-2 flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-200" fill="currentColor" aria-hidden="true">
                <path d="M11 4a7 7 0 015.65 11.12l3.12 3.11a1 1 0 11-1.41 1.42l-3.12-3.12A7 7 0 1111 4zm0 2a5 5 0 100 10 5 5 0 000-10zm0 3a1 1 0 01.99.86L12 10v2a1 1 0 01-1.99.14L10 12v-2a1 1 0 011-1zm-2 0a1 1 0 01.99.86L10 10v2a1 1 0 01-1.99.14L8 12v-2a1 1 0 011-1z" />
              </svg>
              <h2 className="text-lg font-semibold md:text-xl">{HERO_TOOL.title}</h2>
            </div>
            <p className="text-sm leading-relaxed text-sky-100/90">
              {HERO_TOOL.description}
            </p>
          </div>

          <div className="relative z-10 mt-4 md:mt-0 md:ml-8">
            <span className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm transition group-hover:bg-white/25">
              Open tool
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>
        </Link>

        {/* Tool grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="group flex items-start gap-4 rounded-xl bg-white p-4 transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tool.accent}`}>
                {tool.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {tool.title}
                  <span className="ml-1.5 inline-block text-slate-300 opacity-0 transition group-hover:opacity-100 dark:text-slate-600" aria-hidden="true">&rarr;</span>
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {tool.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Guides row */}
        <Link
          href="/guides"
          className="group flex items-center justify-between rounded-xl bg-white px-5 py-4 transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden="true">
                <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Guides</span>
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">Tips and things worth knowing from working in Azure</span>
            </div>
          </div>
          <svg className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </Layout>
  );
}
