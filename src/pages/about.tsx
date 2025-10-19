import Layout from '@/components/Layout';
import Link from 'next/link';
import VersionDisplay from '@/components/VersionDisplay';
import DefinitionsTable from '@/components/DefinitionsTable';
import { GetStaticProps } from 'next';
import { getFileMetadata } from '@/lib/ipService';
import { AzureFileMetadata } from '@/types/azure';

interface AboutProps {
  fileMetadata: AzureFileMetadata[];
}

export default function About({ fileMetadata }: AboutProps) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Azure Hub?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Azure Hub is a unified workspace that brings together Azure IP lookup, service tag exploration, and upcoming diagnostics tooling. It provides a common layout, navigation, and data refresh pipeline to help Azure engineers investigate network boundaries faster."
        }
      },
      {
        "@type": "Question",
        "name": "How often is Azure IP data refreshed?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Azure Hub refreshes Microsoft Azure IP range and service tag data every day from the official download endpoints, covering Azure Public, Azure China, and Azure US Government clouds."
        }
      },
      {
        "@type": "Question",
        "name": "What does the Azure IP Lookup tool provide?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Azure IP Lookup tool verifies whether IP addresses or CIDR ranges are owned by Microsoft Azure, surfaces related service tags, and lists regions, system services, and network feature flags."
        }
      },
      {
        "@type": "Question",
        "name": "Will Azure Hub include tenant-focused tools?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Upcoming modules such as Tenant Insights and Subnet Calculator are in development, and placeholder pages outline their direction while we finalise product requirements."
        }
      },
      {
        "@type": "Question",
        "name": "Is Azure Hub affiliated with Microsoft?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Azure Hub is an independent community project. It relies on Microsoft Azure's public data sets and APIs but is not an official Microsoft service."
        }
      }
    ]
  };

  return (
    <Layout
      title="About Azure Hub"
      description="Discover the mission, data refresh cadence, and upcoming roadmap for Azure Hub, the home for Azure networking tools."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section className="space-y-10">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-10 text-center shadow-xl shadow-slate-950/40">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
            About
          </span>
          <h1 className="mt-6 text-4xl font-semibold text-slate-50">Why we built Azure Hub</h1>
          <p className="mt-4 text-base text-slate-300">
            Azure Hub started as a simple IP lookup tool and has grown into a multi-feature workspace for Azure operators.
            Our goal is to reduce the time it takes to investigate network boundaries, validate service tags, and
            understand tenant context.
          </p>
          <div className="mt-8 flex flex-col gap-4 text-sm text-slate-400 md:flex-row md:justify-center">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-6 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Data Refresh</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">Daily</p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-6 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Current Modules</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">IP Lookup + Service Tags</p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-6 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Maintainer</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">Community</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6 shadow-lg shadow-slate-950/30">
            <h2 className="text-xl font-semibold text-slate-100">How the data flows</h2>
            <p className="mt-3 text-sm text-slate-300">
              We pull the official Microsoft IP range and service tag feeds each day, normalise them, and expose the data
              through serverless APIs consumed by the Azure IP Lookup tool. Historical change numbers are tracked so you
              can correlate updates with your firewall or routing policies.
            </p>
            <div className="mt-4 rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-xs text-slate-400">
              <p className="font-semibold text-slate-200">Latest published change numbers</p>
              <VersionDisplay className="mt-2 text-slate-300" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6 shadow-lg shadow-slate-950/30">
            <h2 className="text-xl font-semibold text-slate-100">Where to start</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>
                Use the{' '}
                <Link href="/tools/ip-lookup" className="font-semibold text-sky-200 hover:text-sky-100">
                  Azure IP Lookup tool
                </Link>{' '}
                to verify ownership of an address or service tag.
              </li>
              <li>
                Explore the{' '}
                <Link href="/tools/service-tags" className="font-semibold text-sky-200 hover:text-sky-100">
                  Service Tags explorer
                </Link>{' '}
                to navigate the Microsoft-defined groupings of IP ranges.
              </li>
              <li>
                Review upcoming experiences such as Tenant Insights and Region Latency Lab via the{' '}
                <Link href="/" className="font-semibold text-sky-200 hover:text-sky-100">
                  Azure Hub dashboard
                </Link>{' '}
                to plan ahead.
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6 shadow-lg shadow-slate-950/30">
          <h2 className="text-xl font-semibold text-slate-100">Service tag feeds &amp; definitions</h2>
          <p className="mt-3 text-sm text-slate-300">
            Azure releases separate JSON payloads for each cloud environment. We surface their change numbers, download
            locations, and last retrieval timestamps so you can audit the pipeline.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40">
            <DefinitionsTable metadata={fileMetadata} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6 shadow-lg shadow-slate-950/30">
          <h2 className="text-xl font-semibold text-slate-100">Frequently asked questions</h2>
          <div className="mt-5 space-y-6">
            <FaqItem
              question="What is Azure Hub?"
              answer="Azure Hub is a consolidated workspace for Azure networking and diagnostics. It provides a shared navigation shell, consistent UX, and a roadmap of modular tooling to analyse IP allocations, service tags, tenants, and latency."
            />
            <FaqItem
              question="How often is the Azure IP data updated?"
              answer="We refresh all supported feeds once every 24 hours. Change numbers and retrieval timestamps are published on this page so you can verify when the latest sync occurred."
            />
            <FaqItem
              question="What are Azure Service Tags?"
              answer="Service tags are Microsoft-maintained collections of IP prefixes that simplify network security rules. Azure Hub exposes these tags and their supporting metadata, including network feature flags such as API, NSG, UDR, FW, and VSE."
            />
            <FaqItem
              question="Can I search by region or service?"
              answer="Yes. The Azure IP Lookup tool supports region-only searches, service-only searches, and combined queries. Use the filters or text input to pivot between them."
            />
            <FaqItem
              question="Is Azure Hub affiliated with Microsoft?"
              answer="No. Azure Hub is an independent community effort. We rely on public Microsoft documentation and APIs, and we link directly to the official download sources for verification."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6 text-sm text-slate-300 shadow-lg shadow-slate-950/30">
          <h2 className="text-xl font-semibold text-slate-100">Transparency &amp; support</h2>
          <p className="mt-3">
            Azure Hub is open source and welcomes community feedback. Visit the{' '}
            <Link
              href="https://github.com/endgor/azure-ip-lookup"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-200 hover:text-sky-100"
            >
              GitHub repository
            </Link>{' '}
            to open issues, propose improvements, or follow the roadmap.
          </p>
        </div>
      </section>
    </Layout>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
      <h3 className="text-base font-semibold text-slate-100">{question}</h3>
      <p className="mt-2 text-sm text-slate-300">{answer}</p>
    </div>
  );
}

export const getStaticProps: GetStaticProps<AboutProps> = async () => {
  try {
    const fileMetadata = await getFileMetadata();
    return {
      props: {
        fileMetadata,
      },
    };
  } catch (error) {
    return {
      props: {
        fileMetadata: [],
      },
    };
  }
};
