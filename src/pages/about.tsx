import Layout from '@/components/Layout';
import Link from 'next/link';
import DefinitionsTable from '@/components/DefinitionsTable';
import { GetStaticProps } from 'next';
import { getFileMetadata } from '@/lib/ipService';
import { AzureFileMetadata } from '@/types/azure';

interface AboutProps {
  fileMetadata: AzureFileMetadata[];
}

export default function About({ fileMetadata }: AboutProps) {
  return (
    <Layout
      title="About Azure Hub"
      description="Discover the mission, data refresh cadence, and upcoming roadmap for Azure Hub, the home for Azure networking tools."
    >
      <section className="space-y-8">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">About Azure Hub</h1>
          <p className="text-base text-slate-600">
            Azure Hub started as a simple IP lookup tool and is steadily growing into a multi-feature workspace for Azure
            administrators who need fast access to the right utilities. It remains a hobby project maintained by me (Ender),
            with a focus on making common networking tasks quicker to execute and easier to repeat.
          </p>
          <p className="text-base text-slate-600">
            Data on this site refreshes daily from the official Microsoft feeds across Azure Public, China, and US
            Government clouds.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Service tag feeds &amp; definitions</h2>
          <p className="text-base text-slate-600">
            Review the latest change numbers, download locations, and retrieval timestamps for each supported cloud. The
            table updates automatically whenever Microsoft publishes new payloads.
          </p>
          <DefinitionsTable metadata={fileMetadata} />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Open source &amp; feedback</h2>
          <p className="text-base text-slate-600">
            Azure Hub is an independent community project. Visit the{' '}
            <Link
              href="https://github.com/endgor/azure-hub"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-600 hover:text-sky-700"
            >
              GitHub repository
            </Link>{' '}
            to share ideas, report issues, or follow the roadmap.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Credits</h2>
          <ul className="space-y-2 text-base text-slate-600">
            <li>
              <Link
                href="https://github.com/davidc/subnets"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-600 hover:text-sky-700"
              >
                DavidC
              </Link>{' '}
              for the Visual Subnet Calculator.
            </li>
          </ul>
        </div>
      </section>
    </Layout>
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
