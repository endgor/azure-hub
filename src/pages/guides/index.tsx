import { GetStaticProps } from 'next';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getAllGuides, GuideCategory } from '@/lib/guides';

interface GuidesPageProps {
  categories: GuideCategory[];
}

export default function GuidesPage({ categories }: GuidesPageProps) {
  return (
    <Layout
      title="Azure Guides - Quick Reference & Best Practices"
      description="Quick reference guides, FAQs, and best practices for Azure services including VMs, networking, and RBAC."
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
            Azure Guides
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Quick reference guides and best practices for Azure services.
          </p>
        </div>

        {/* Guides List */}
        <div className="space-y-3">
          {categories.flatMap((category) =>
            category.guides.map((guide) => (
              <Link
                key={`${guide.category}-${guide.slug}`}
                href={`/guides/${guide.category}/${guide.slug}`}
                className="group block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-sky-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                        {guide.meta.title}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(guide.meta.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {guide.meta.description}
                    </p>
                    {guide.meta.tags && guide.meta.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {guide.meta.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 flex-shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-600 dark:group-hover:text-sky-400"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </Link>
            ))
          )}

          {categories.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-slate-600 dark:text-slate-300">
                No guides available yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<GuidesPageProps> = async () => {
  const categories = getAllGuides();

  return {
    props: {
      categories
    }
  };
};
