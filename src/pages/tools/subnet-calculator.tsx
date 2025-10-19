import Link from 'next/link';
import Layout from '@/components/Layout';

export default function SubnetCalculatorComingSoon() {
  return (
    <Layout
      title="Subnet Calculator"
      description="Preview of the upcoming Azure Hub subnet planning and CIDR allocation toolkit."
    >
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-10 text-center shadow-xl shadow-slate-950/30">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
          Coming Soon
        </span>
        <h1 className="mt-6 text-3xl font-semibold text-slate-100">Subnet Calculator</h1>
        <p className="mt-3 text-sm text-slate-300">
          Plan CIDR ranges, reserve address space, and export ready-to-deploy Azure networking templates. We&apos;re still
          iterating on the interaction model and calculations before release.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/tools/ip-lookup"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-500/40 hover:text-sky-100"
          >
            Explore live tools
          </Link>
          <Link
            href="https://github.com/endgor/azure-ip-lookup/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-slate-50"
          >
            Share feedback
          </Link>
        </div>
      </section>
    </Layout>
  );
}
