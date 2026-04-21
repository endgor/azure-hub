import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import Layout from '@/components/Layout';
import GuideContent from '@/components/GuideContent';
import GuideTOC from '@/components/GuideTOC';
import type { Guide } from '@/lib/guides';
import siteData from '@/generated/site-data.json';
import type { GeneratedSiteData } from '@/types/generatedSiteData';

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
      articleSchema={{
        headline: guide.meta.title,
        description: guide.meta.description,
        datePublished: guide.meta.date,
        dateModified: guide.meta.date
      }}
    >
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/guides/"
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

        {/* Content + TOC */}
        <div className="relative flex gap-10">
          <div className="min-w-0 flex-1">
            <GuideContent html={guide.content || ''} />
          </div>
          {guide.headings && guide.headings.length >= 3 && (
            <div className="w-56 flex-shrink-0">
              <GuideTOC headings={guide.headings} />
            </div>
          )}
        </div>

        {/* Back to Guides */}
        <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-700">
          <Link
            href="/guides/"
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
  const data = siteData as GeneratedSiteData;
  const slugs = data.guides.guides.map((guide) => ({
    category: guide.category,
    slug: guide.slug
  }));

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
  const data = siteData as GeneratedSiteData;
  const guide = data.guides.guides.find((item) => item.category === category && item.slug === slug) ?? null;

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
