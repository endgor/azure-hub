import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

type IconKey =
  | 'dashboard'
  | 'ipLookup'
  | 'serviceTags'
  | 'tenant'
  | 'subnet'
  | 'latency'
  | 'github';

interface NavItem {
  label: string;
  description?: string;
  href: string;
  icon: IconKey;
  comingSoon?: boolean;
  disabled?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface LayoutProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

const DEFAULT_TITLE = 'Azure Hub';
const DEFAULT_DESCRIPTION =
  'Azure Hub brings together networking, identity, and diagnostics tooling to help you explore and understand Microsoft Azure resources.';

const ICONS: Record<IconKey, (active: boolean) => JSX.Element> = {
  dashboard: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-sky-600' : 'text-slate-400'}`}
    >
      <path
        fill="currentColor"
        d="M11 4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1h-7zm-8 0c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h5c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1H3zm0 9c-.55 0-1 .45-1 1v5c0 .55.45 1 1 1h7c.55 0 1-.45 1-1v-5c0-.55-.45-1-1-1H3zm11 0c-.55 0-1 .45-1 1v5c0 .55.45 1 1 1h5c.55 0 1-.45 1-1v-5c0-.55-.45-1-1-1h-5z"
      />
    </svg>
  ),
  ipLookup: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-sky-600' : 'text-slate-400'}`}
    >
      <path
        fill="currentColor"
        d="M11 4a7 7 0 015.65 11.12l3.12 3.11a1 1 0 11-1.41 1.42l-3.12-3.12A7 7 0 1111 4zm0 2a5 5 0 100 10 5 5 0 000-10zm0 3a1 1 0 01.99.86L12 10v2a1 1 0 01-1.99.14L10 12v-2a1 1 0 011-1zm-2 0a1 1 0 01.99.86L10 10v2a1 1 0 01-1.99.14L8 12v-2a1 1 0 011-1z"
      />
    </svg>
  ),
  serviceTags: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-sky-600' : 'text-slate-400'}`}
    >
      <path
        fill="currentColor"
        d="M3 4a2 2 0 012-2h4.586a2 2 0 011.414.586l8.414 8.414a2 2 0 010 2.828l-4.586 4.586a2 2 0 01-2.828 0L3.586 10.414A2 2 0 013 9V4zm4 3a2 2 0 100-4 2 2 0 000 4z"
      />
    </svg>
  ),
  tenant: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-sky-600' : 'text-slate-400'}`}
    >
      <path
        fill="currentColor"
        d="M4 4a2 2 0 012-2h4a2 2 0 012 2v3h5a2 2 0 012 2v3h-2V9h-5v11h-2v-4H6v4H4V4zm4 0H6v5h4V4H8zm12 10a2 2 0 012 2v5h-2v-3h-4v3h-2v-5a2 2 0 012-2h4zm-1 2h-2v1h2v-1z"
      />
    </svg>
  ),
  subnet: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-sky-600' : 'text-slate-400'}`}
    >
      <path
        fill="currentColor"
        d="M5 3a2 2 0 00-2 2v5h18V5a2 2 0 00-2-2H5zm16 9H3v5a2 2 0 002 2h6v-3H9a1 1 0 110-2h6a1 1 0 010 2h-2v3h6a2 2 0 002-2v-5z"
      />
    </svg>
  ),
  latency: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-sky-600' : 'text-slate-400'}`}
    >
      <path
        fill="currentColor"
        d="M5 4a1 1 0 011.78-.62l4.22 5.62 2.19-2.73a1 1 0 011.51 0l6 7.5A1 1 0 0119.98 16H4.02a1 1 0 01-.81-1.59L5 11.53V4zm14 14a1 1 0 110 2H5a1 1 0 110-2h14z"
      />
    </svg>
  ),
  github: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-sky-600' : 'text-slate-400'}`}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68.5.09.68-.23.68-.5 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.45-1.17-1.11-1.48-1.11-1.48-.91-.62.07-.61.07-.61 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.12-4.56-4.99 0-1.1.39-1.99 1.03-2.7-.1-.25-.45-1.28.1-2.67 0 0 .84-.27 2.75 1.03a9.3 9.3 0 012.5-.35c.85 0 1.7.12 2.5.35 1.9-1.3 2.74-1.03 2.74-1.03.55 1.39.2 2.42.1 2.67.64.7 1.03 1.6 1.03 2.7 0 3.88-2.34 4.73-4.57 4.99.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.68.5A10.06 10.06 0 0022 12.26C22 6.58 17.52 2 12 2z"
      />
    </svg>
  )
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: 'dashboard'
      }
    ]
  },
  {
    label: 'Networking',
    items: [
      {
        label: 'IP Lookup',
        href: '/tools/ip-lookup',
        icon: 'ipLookup'
      },
      {
        label: 'Service Tags',
        href: '/tools/service-tags',
        icon: 'serviceTags'
      },
      {
        label: 'Subnet Calculator',
        href: '/tools/subnet-calculator',
        icon: 'subnet',
        comingSoon: true,
        disabled: true
      }
    ]
  },
  {
    label: 'Identity',
    items: [
      {
        label: 'Tenant Lookup',
        href: '/tools/tenant-lookup',
        icon: 'tenant'
      }
    ]
  },
  {
    label: 'Diagnostics',
    items: [
      {
        label: 'Region Latency',
        href: '/tools/region-latency',
        icon: 'latency',
        comingSoon: true,
        disabled: true
      }
    ]
  }
];

export default function Layout({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  children
}: LayoutProps) {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const meta = useMemo(() => {
    const pageTitle = title === DEFAULT_TITLE ? title : `${title} · Azure Hub`;
    const canonicalUrl = `https://azurehub.org${router.asPath}`;

    return {
      title: pageTitle,
      description,
      url: canonicalUrl
    };
  }, [description, router.asPath, title]);

  const matchRoute = (href: string) => {
    if (!href.startsWith('/')) {
      return false;
    }
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={meta.url} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={meta.url} />
        <meta property="og:site_name" content="Azure Hub" />
        <meta property="og:image" content="https://azurehub.org/favicons/android-chrome-512x512.png" />
        <meta property="og:image:alt" content="Azure Hub logo" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={meta.title} />
        <meta property="twitter:description" content={meta.description} />
        <meta property="twitter:image" content="https://azurehub.org/favicons/android-chrome-512x512.png" />
        <meta name="theme-color" content="#f1f5f9" />
      </Head>

      <div className="min-h-screen bg-slate-100 text-slate-900">
        <div className="flex h-screen overflow-hidden">
          <aside
            className={`relative flex flex-col border-r border-slate-200 bg-white/95 backdrop-blur transition-all duration-200 ease-out ${
              isSidebarCollapsed ? 'w-20' : 'w-72'
            }`}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-5">
              <Link href="/" className="flex items-center gap-3" aria-label="Azure Hub home">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 font-semibold">
                  AH
                </span>
                <span className={`text-lg font-semibold tracking-tight ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Azure Hub
                </span>
              </Link>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                aria-pressed={isSidebarCollapsed}
                aria-label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              >
                <span className="sr-only">{isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}</span>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 text-current"
                >
                  {isSidebarCollapsed ? (
                    <path
                      fill="currentColor"
                      d="M9.3 7.3a1 1 0 011.4 0L15 11.6a1 1 0 01.03 1.35l-.03.03-4.3 4.3a1 1 0 01-1.5-1.32l.1-.11L12.58 12l-3.28-3.29a1 1 0 010-1.41z"
                    />
                  ) : (
                    <path
                      fill="currentColor"
                      d="M14.7 7.3a1 1 0 010 1.4L11.41 12l3.3 3.29a1 1 0 01-1.32 1.5l-.11-.1-4.3-4.3a1 1 0 01-.03-1.35l.03-.03 4.3-4.3a1 1 0 011.41 0z"
                    />
                  )}
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p
                    className={`px-3 text-xs font-semibold uppercase tracking-widest text-slate-500 ${
                      isSidebarCollapsed ? 'hidden' : 'block'
                    }`}
                  >
                    {section.label}
                  </p>
                  <div className="mt-2 space-y-1">
                    {section.items.map((item) => {
                      const active = matchRoute(item.href);
                      const disabled = item.disabled;
                      const baseClasses =
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
                      const stateClasses = disabled
                        ? 'cursor-not-allowed text-slate-300'
                        : active
                        ? 'bg-sky-100 text-slate-900'
                        : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900';

                      return (
                        <Link
                          key={item.label}
                          href={disabled ? '#' : item.href}
                          className={`${baseClasses} ${stateClasses}`}
                          aria-disabled={disabled}
                          tabIndex={disabled ? -1 : undefined}
                          onClick={(event) => {
                            if (disabled) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                              active ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            {ICONS[item.icon](active)}
                          </span>
                          <span className={`${isSidebarCollapsed ? 'hidden' : 'block'}`}>{item.label}</span>
                          {item.comingSoon && !isSidebarCollapsed && (
                            <span className="ml-auto text-xs font-semibold uppercase text-slate-400">Soon</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-slate-200 px-3 py-4">
              <Link
                href="https://github.com/endgor/azure-ip-lookup"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-sky-50 hover:text-slate-900"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                  {ICONS.github(false)}
                </span>
                <span className={`${isSidebarCollapsed ? 'hidden' : 'block'}`}>GitHub Repository</span>
              </Link>
            </div>
          </aside>

          <div className="flex flex-1 flex-col">
            <main className="flex-1 overflow-y-auto px-6 py-10">
              <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
