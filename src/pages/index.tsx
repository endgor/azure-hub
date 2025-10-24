import Link from 'next/link';
import Layout from '@/components/Layout';

const CORE_TOOLS = [
  {
    title: 'Azure IP Lookup',
    description: 'Verify whether an IP, CIDR, or service tag belongs to Azure and explore its metadata.',
    href: '/tools/ip-lookup',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600" aria-hidden="true">
        <path
          fill="currentColor"
          d="M11 4a7 7 0 015.65 11.12l3.12 3.11a1 1 0 11-1.41 1.42l-3.12-3.12A7 7 0 1111 4zm0 2a5 5 0 100 10 5 5 0 000-10zm0 3a1 1 0 01.99.86L12 10v2a1 1 0 01-1.99.14L10 12v-2a1 1 0 011-1zm-2 0a1 1 0 01.99.86L10 10v2a1 1 0 01-1.99.14L8 12v-2a1 1 0 011-1z"
        />
      </svg>
    )
  },
  {
    title: 'Service Tags',
    description: 'Browse Azure service tags.',
    href: '/tools/service-tags',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 4a2 2 0 012-2h4.586a2 2 0 011.414.586l8.414 8.414a2 2 0 010 2.828l-4.586 4.586a2 2 0 01-2.828 0L3.586 10.414A2 2 0 013 9V4zm4 3a2 2 0 100-4 2 2 0 000 4z"
        />
      </svg>
    )
  },
  {
    title: 'Tenant Lookup',
    description: 'Discover tenant IDs, default domains, and Azure AD region scope by domain.',
    href: '/tools/tenant-lookup',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 4a2 2 0 012-2h4a2 2 0 012 2v3h5a2 2 0 012 2v3h-2V9h-5v11h-2v-4H6v4H4V4zm4 0H6v5h4V4H8zm12 10a2 2 0 012 2v5h-2v-3h-4v3h-2v-5a2 2 0 012-2h4zm-1 2h-2v1h2v-1z"
        />
      </svg>
    )
  },
  {
    title: 'Subnet Calculator',
    description: 'Plan subnets, model address allocation, and export results for Azure deployments.',
    href: '/tools/subnet-calculator',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5 3a2 2 0 00-2 2v5h18V5a2 2 0 00-2-2H5zm16 9H3v5a2 2 0 002 2h6v-3H9a1 1 0 110-2h6a1 1 0 010 2h-2v3h6a2 2 0 002-2v-5z"
        />
      </svg>
    )
  }
] as const;

const UPCOMING_TOOLS = [
  {
    title: 'RBAC Least Privilege Generator',
    description: 'Design scoped Azure RBAC role definitions that follow least-privilege guidance.',
    href: '/tools/rbac-least-privilege',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-400" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2.25a.75.75 0 01.26.048l7.5 2.7a.75.75 0 01.49.702V11c0 5.038-3.36 9.693-8.24 11.145a.75.75 0 01-.52 0C6.61 20.693 3.25 16.038 3.25 11V5.7a.75.75 0 01.49-.702l7.5-2.7a.75.75 0 01.26-.048zM12 3.9L5.75 6.08V11c0 4.142 2.775 7.984 6.25 9.276 3.475-1.292 6.25-5.134 6.25-9.276V6.08L12 3.9z"
        />
        <path
          fill="currentColor"
          d="M16.53 10.47a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06l1.47 1.47 3.22-3.22a.75.75 0 011.06 0z"
        />
      </svg>
    )
  },
  {
    title: 'Region Latency',
    description: 'Measure latency between Azure regions.',
    href: '/tools/region-latency',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-400" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5 4a1 1 0 011.78-.62l4.22 5.62 2.19-2.73a1 1 0 011.51 0l6 7.5A1 1 0 0119.98 16H4.02a1 1 0 01-.81-1.59L5 11.53V4zm14 14a1 1 0 110 2H5a1 1 0 110-2h14z"
        />
      </svg>
    )
  }
] as const;

export default function Home() {
  return (
    <Layout
      title="Azure Hub"
      description="Azure Hub centralizes Azure IP lookup, tenant discovery, service tag exploration, and subnet planning tools for cloud engineers."
    >
      <section className="space-y-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Pick a tool and get to work.</h1>
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
