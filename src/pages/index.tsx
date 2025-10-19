import Link from 'next/link';
import Layout from '@/components/Layout';

const CORE_TOOLS = [
  {
    title: 'Azure IP Lookup',
    description: 'Verify whether an IP, CIDR, or service tag belongs to Azure and explore its metadata.',
    href: '/tools/ip-lookup',
    badge: 'Live',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5a7 7 0 015.65 11.12l2.12 2.11a1 1 0 11-1.41 1.42l-2.13-2.12A7 7 0 1112 5zm0 2a5 5 0 100 10 5 5 0 000-10zm0 3a1 1 0 011 .88L13 11v2a1 1 0 01-2 .12L11 13v-2a1 1 0 011-1z"
        />
      </svg>
    )
  },
  {
    title: 'Tenant Lookup',
    description: 'Discover tenant IDs, default domains, and Azure AD region scope by domain.',
    href: '/tools/tenant-lookup',
    badge: 'New',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a5 5 0 015 5v1h1a4 4 0 013.98 3.6L22 12v4a3 3 0 01-2.82 3H19v1a2 2 0 01-1.85 1.99L17 22H7a2 2 0 01-1.99-1.85L5 20v-1h-.18A2.82 2.82 0 012 16.18V12a4 4 0 013.8-3.99L6 8h1V7a5 5 0 015-5zm0 2a3 3 0 00-2.95 2.6L9 7v1h6V7a3 3 0 00-2.4-2.95L12 4zm6 6H6a2 2 0 00-1.99 1.85L4 12v4a.82.82 0 00.7.82L5 17h14a1 1 0 001-.88l.01-.12v-4a2 2 0 00-1.85-1.99L18 10z"
        />
      </svg>
    )
  },
  {
    title: 'Service Tags Explorer',
    description: 'Browse Microsoft service tags and jump directly into their associated address ranges.',
    href: '/tools/service-tags',
    badge: 'Updated',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 3h6l10 10-6 6L4 9V3zm5 2H6v2.59l8.59 8.59L17.59 13 9 5z"
        />
      </svg>
    )
  }
] as const;

const UPCOMING_TOOLS = [
  {
    title: 'Subnet Calculator',
    description: 'Plan subnets, address allocation, and export templates for Azure networking.',
    href: '/tools/subnet-calculator',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-400" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 3h16a1 1 0 011 1v7H3V4a1 1 0 011-1zm0 11h7v7H4a1 1 0 01-1-1v-6zm9 0h8v6a1 1 0 01-1 1h-7v-7z"
        />
      </svg>
    )
  },
  {
    title: 'Region Latency Lab',
    description: 'Measure edge-to-region RTT and compare service availability around the globe.',
    href: '/tools/region-latency',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-400" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 6a2 2 0 012-2h2.18a2 2 0 011.6.8l1.24 1.6H20a1 1 0 010 2h-8a1 1 0 01-.8-.4l-1.24-1.6H6a2 2 0 00-2 2v9h10v2H6a2 2 0 01-2-2V6zm16 8a1 1 0 011 1v5h-2v-2h-4v2h-2v-5a1 1 0 011-1h6zm-1 2h-4v1h4v-1z"
        />
      </svg>
    )
  }
] as const;

export default function Home() {
  return (
    <Layout title="Azure Hub" description="Azure Hub unifies essential Azure networking and diagnostics tools under a single experience.">
      <section className="space-y-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Pick a tool and get to work.</h1>
            <p className="max-w-xl text-sm text-slate-600 md:text-base">
              Azure Hub keeps the essentials close: verify addresses, inspect service tags, and track what&apos;s coming next.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <InfoPill label="Data refresh" value="Daily" />
            <InfoPill label="Service tags" value="900+" />
            <InfoPill label="Regions tracked" value="60+" />
          </div>
        </div>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CORE_TOOLS.map((tool) => (
              <Link
                key={tool.title}
                href={tool.href}
                className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    {tool.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">{tool.badge}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{tool.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{tool.description}</p>
                <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-sky-600 transition group-hover:text-sky-700">
                  Open tool <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">On the roadmap</h2>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Preview</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {UPCOMING_TOOLS.map((tool) => (
              <div
                key={tool.title}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                    {tool.icon}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{tool.title}</h3>
                </div>
                <p className="text-sm text-slate-600">{tool.description}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </Layout>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-left shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
