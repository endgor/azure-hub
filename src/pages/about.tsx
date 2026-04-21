import { useState, FormEvent } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import DefinitionsTable from '@/components/DefinitionsTable';
import Button from '@/components/shared/Button';
import { GetStaticProps } from 'next';
import siteData from '@/generated/site-data.json';
import type { GeneratedSiteData } from '@/types/generatedSiteData';
import { AzureFileMetadata } from '@/types/azure';

interface AboutProps {
  fileMetadata: AzureFileMetadata[];
  rbacLastRetrieved: string | null;
}

const FEEDBACK_TYPES = ['Bug report', 'Feature request', 'Question', 'Other'] as const;

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400';

function FeedbackForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<string>(FEEDBACK_TYPES[0]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), type, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong.');
        setStatus('error');
        return;
      }
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
      setType(FEEDBACK_TYPES[0]);
    } catch {
      setErrorMsg('Failed to send. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-4 rounded-xl bg-white p-8 dark:bg-slate-900">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Feedback</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Have a suggestion, found a bug, or just want to say hi? Send me a message below or open an issue on{' '}
        <Link
          href="https://github.com/endgor/azure-hub"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
        >
          GitHub
        </Link>
        .
      </p>

      {status === 'sent' ? (
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          Thanks for your feedback! I&apos;ll get back to you if needed.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot */}
          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="feedback-name" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Name <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="feedback-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="feedback-email" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Email <span className="text-slate-400">(optional, for replies)</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={200}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="feedback-type" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Type
            </label>
            <select
              id="feedback-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              {FEEDBACK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="feedback-message" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Message
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className={inputClass + ' resize-y'}
            />
            <p className="mt-1 text-xs text-slate-400">{message.length}/2000</p>
          </div>

          {status === 'error' && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <Button type="submit" isLoading={status === 'sending'} disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending...' : 'Send feedback'}
          </Button>
        </form>
      )}
    </div>
  );
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
        <div className="space-y-4 rounded-xl bg-white p-8 dark:bg-slate-900">
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

        <div className="space-y-4 rounded-xl bg-white p-8 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Service tag feeds &amp; definitions</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Service tag data comes from Microsoft&apos;s official Download Center feeds for Azure Public, China, and US Government clouds.
            The table below shows the latest change numbers and retrieval timestamps for each feed.
          </p>
          <DefinitionsTable metadata={fileMetadata} />
        </div>

        <div className="space-y-4 rounded-xl bg-white p-8 dark:bg-slate-900">
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

        <FeedbackForm />

        <div className="space-y-4 rounded-xl bg-white p-8 dark:bg-slate-900">
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
  const data = siteData as GeneratedSiteData;

  return {
    props: {
      fileMetadata: data.about.fileMetadata,
      rbacLastRetrieved: data.about.rbacLastRetrieved,
    },
  };
};
