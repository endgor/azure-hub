import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Custom404() {
  return (
    <Layout title="Page Not Found" noIndex>
      <div className="mx-auto max-w-3xl text-center">
        <div className="rounded-3xl border border-slate-200 bg-white px-10 py-12 shadow-sm dark:border-[#363638] dark:bg-[#1B1B1C]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Error</p>
          <h1 className="mt-4 text-6xl font-semibold text-slate-900 dark:text-slate-50">404</h1>
          <h2 className="mt-3 text-xl font-semibold text-slate-700 dark:text-slate-200">We can&apos;t find that page</h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            The resource you&apos;re looking for doesn&apos;t exist or has moved. Jump back into the Azure Hub tools instead.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Link
              href="/tools/ip-lookup/"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-sky-400/60 hover:bg-white dark:border-[#363638] dark:bg-[#222224] dark:hover:border-sky-500/40 dark:hover:bg-[#2C2C2E]"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Azure IP Lookup</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Verify IP ownership and inspect service tags.</p>
            </Link>
            <Link
              href="/tools/service-tags/"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-sky-400/60 hover:bg-white dark:border-[#363638] dark:bg-[#222224] dark:hover:border-sky-500/40 dark:hover:bg-[#2C2C2E]"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Service Tags Explorer</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Browse the Microsoft-maintained tag catalogue.</p>
            </Link>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-sky-700 transition hover:border-sky-400/60 hover:text-sky-800 dark:border-slate-700 dark:text-sky-200 dark:hover:border-sky-500/40 dark:hover:text-sky-100"
            >
              ← Return to Azure Hub
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Need help? Open an issue on{' '}
              <a
                href="https://github.com/endgor/azure-hub/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
              >
                GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
