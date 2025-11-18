import Layout from '@/components/Layout';
import Link from 'next/link';
import DefinitionsTable from '@/components/DefinitionsTable';
import { GetStaticProps } from 'next';
import { getFileMetadata, getRbacFileDate } from '@/lib/ipService';
import { AzureFileMetadata } from '@/types/azure';

interface AboutProps {
  fileMetadata: AzureFileMetadata[];
  rbacLastRetrieved: string | null;
}

export default function About({ fileMetadata, rbacLastRetrieved }: AboutProps) {
  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return 'Unknown';
    try {
      return new Date(isoDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Layout
      title="About Azure Hub - Mission, Data Sources & Project Roadmap"
      description="Discover the mission, data refresh cadence, and upcoming roadmap for Azure Hub, the home for Azure networking tools."
    >
      <section className="space-y-8">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">About Azure Hub</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Azure Hub started as a simple IP lookup tool and is steadily growing into a multi-feature workspace for Azure
            administrators who need fast access to the right utilities. It remains a hobby project maintained by me (Ender),
            with a focus on making common networking and identity tasks quicker to execute and easier to repeat.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Data on this site refreshes daily from the official Microsoft feeds across Azure Public, China, and US
            Government clouds.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Service tag feeds &amp; definitions</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Service tag data comes from Microsoft&apos;s official Download Center feeds for Azure Public, China, and US Government clouds.
            The table below shows the latest change numbers and retrieval timestamps for each feed.
          </p>
          <DefinitionsTable metadata={fileMetadata} />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">RBAC Role Definitions</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Built-in role definitions are retrieved from the Azure Resource Manager API and Microsoft Graph API.
            These are updated periodically to keep the calculators current with newly released roles and permissions.
          </p>
          {rbacLastRetrieved && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>Last retrieved:</strong> {formatDate(rbacLastRetrieved)}
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Open source &amp; feedback</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Azure Hub is an independent community project. Visit the{' '}
            <Link
              href="https://github.com/endgor/azure-hub"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
            >
              GitHub repository
            </Link>{' '}
            to share ideas, report issues, or follow the roadmap.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Credits</h2>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <Link
                href="https://github.com/davidc/subnets"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
              >
                DavidC
              </Link>{' '}
              for the Visual Subnet Calculator.
            </li>
            <li>
              <Link
                href="https://github.com/vjirovsky/azure-rbac-least-calculator"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
              >
                Václav Jirovsky
              </Link>{' '}
              for the inspiration for the RBAC Calculator.
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
    const rbacLastRetrieved = await getRbacFileDate();
    return {
      props: {
        fileMetadata,
        rbacLastRetrieved,
      },
    };
  } catch {
    return {
      props: {
        fileMetadata: [],
        rbacLastRetrieved: null,
      },
    };
  }
};
