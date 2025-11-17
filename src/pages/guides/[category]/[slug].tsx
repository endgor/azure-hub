import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getGuide, getAllGuideSlugs, Guide } from '@/lib/guides';

interface GuidePageProps {
  guide: Guide;
}

export default function GuidePage({ guide }: GuidePageProps) {
  return (
    <Layout
      title={`${guide.meta.title} - Azure Hub Guides`}
      description={guide.meta.description}
      keywords={[...guide.meta.tags, guide.meta.category]}
      canonicalUrl={`https://azurehub.org/guides/${guide.category}/${guide.slug}/`}
    >
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/guides"
            className="text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
          >
            Guides
          </Link>
          <span className="text-slate-400 dark:text-slate-500">/</span>
          <span className="text-slate-600 dark:text-slate-300">{guide.meta.title}</span>
        </nav>

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
            {guide.meta.title}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300">
            {guide.meta.description}
          </p>

          {/* Tags */}
          {guide.meta.tags && guide.meta.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {guide.meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <article
          className="prose prose-slate max-w-none dark:prose-invert
            prose-headings:font-semibold prose-headings:text-slate-900 dark:prose-headings:text-slate-100
            prose-h1:text-2xl prose-h1:mb-4
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-7
            prose-a:text-sky-600 dark:prose-a:text-sky-300 prose-a:no-underline hover:prose-a:underline
            prose-code:text-sky-600 dark:prose-code:text-sky-300 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:before:content-[''] prose-code:after:content-['']
            prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-pre:border prose-pre:border-slate-700
            prose-table:border-collapse prose-table:w-full
            prose-th:bg-slate-50 dark:prose-th:bg-slate-800 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:border prose-th:border-slate-300 dark:prose-th:border-slate-600
            prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-slate-300 dark:prose-td:border-slate-600
            prose-ul:list-disc prose-ul:pl-6
            prose-ol:list-decimal prose-ol:pl-6
            prose-li:text-slate-600 dark:prose-li:text-slate-300
            prose-blockquote:border-l-4 prose-blockquote:border-sky-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400
            prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-semibold"
          dangerouslySetInnerHTML={{ __html: guide.content || '' }}
        />

        {/* Back to Guides */}
        <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-700">
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
          >
            <span aria-hidden="true">←</span> Back to all guides
          </Link>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllGuideSlugs();

  return {
    paths: slugs.map((item) => ({
      params: {
        category: item.category,
        slug: item.slug
      }
    })),
    fallback: false
  };
};

export const getStaticProps: GetStaticProps<GuidePageProps> = async ({ params }) => {
  const category = params?.category as string;
  const slug = params?.slug as string;

  const guide = await getGuide(category, slug);

  if (!guide) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      guide
    }
  };
};
