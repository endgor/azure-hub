import Link from 'next/link';
import Layout from '@/components/Layout';

const CORE_TOOLS = [
  {
    title: 'Azure IP Lookup',
    href: '/tools/ip-lookup',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600 dark:text-sky-300" aria-hidden="true">
        <path
          fill="currentColor"
          d="M11 4a7 7 0 015.65 11.12l3.12 3.11a1 1 0 11-1.41 1.42l-3.12-3.12A7 7 0 1111 4zm0 2a5 5 0 100 10 5 5 0 000-10zm0 3a1 1 0 01.99.86L12 10v2a1 1 0 01-1.99.14L10 12v-2a1 1 0 011-1zm-2 0a1 1 0 01.99.86L10 10v2a1 1 0 01-1.99.14L8 12v-2a1 1 0 011-1z"
        />
      </svg>
    )
  },
  {
    title: 'Service Tags',
    href: '/tools/service-tags',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600 dark:text-sky-300" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 4a2 2 0 012-2h4.586a2 2 0 011.414.586l8.414 8.414a2 2 0 010 2.828l-4.586 4.586a2 2 0 01-2.828 0L3.586 10.414A2 2 0 013 9V4zm4 3a2 2 0 100-4 2 2 0 000 4z"
        />
      </svg>
    )
  },
  {
    title: 'Tenant Lookup',
    href: '/tools/tenant-lookup',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600 dark:text-sky-300" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 4a2 2 0 012-2h4a2 2 0 012 2v3h5a2 2 0 012 2v3h-2V9h-5v11h-2v-4H6v4H4V4zm4 0H6v5h4V4H8zm12 10a2 2 0 012 2v5h-2v-3h-4v3h-2v-5a2 2 0 012-2h4zm-1 2h-2v1h2v-1z"
        />
      </svg>
    )
  },
  {
    title: 'Subnet Calculator',
    href: '/tools/subnet-calculator',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-600 dark:text-sky-300" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5 3a2 2 0 00-2 2v5h18V5a2 2 0 00-2-2H5zm16 9H3v5a2 2 0 002 2h6v-3H9a1 1 0 110-2h6a1 1 0 010 2h-2v3h6a2 2 0 002-2v-5z"
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
        <div className="space-y-2 md:space-y-3">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 md:text-3xl lg:text-4xl">
            Pick a tool and get to work.
          </h1>
        </div>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CORE_TOOLS.map((tool) => (
              <Link
                key={tool.title}
                href={tool.href}
                className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-800/60 dark:hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                    {tool.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{tool.title}</h3>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 transition group-hover:text-sky-700 dark:text-sky-300 dark:group-hover:text-sky-200">
                  Open tool <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </Layout>
  );
}
