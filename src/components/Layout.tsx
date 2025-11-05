import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, ReactElement } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLocalStorageBoolean } from '@/hooks/useLocalStorageState';

type IconKey =
  | 'dashboard'
  | 'ipLookup'
  | 'serviceTags'
  | 'tenant'
  | 'subnet'
  | 'rbac'
  | 'github'
  | 'help';

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

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface ToolSchema {
  name: string;
  applicationCategory: string;
  operatingSystem?: string;
  offers?: {
    price: string;
    priceCurrency?: string;
  };
}

interface LayoutProps {
  title?: string;
  description?: string;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  toolSchema?: ToolSchema;
  children: ReactNode;
}

const DEFAULT_TITLE = 'Azure Hub';
const DEFAULT_DESCRIPTION =
  'Azure Hub delivers Azure IP lookup, tenant discovery, service tag exploration, and subnet planning tools for cloud architects and administrators.';
const DEFAULT_KEYWORDS = [
  'Azure IP lookup',
  'Azure tenant lookup',
  'Azure subnet calculator',
  'Azure service tags',
  'Microsoft Entra tools',
  'Azure networking utilities'
];

const ICONS: Record<IconKey, (active: boolean) => ReactElement> = {
  dashboard: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
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
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
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
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
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
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
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
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M5 3a2 2 0 00-2 2v5h18V5a2 2 0 00-2-2H5zm16 9H3v5a2 2 0 002 2h6v-3H9a1 1 0 110-2h6a1 1 0 010 2h-2v3h6a2 2 0 002-2v-5z"
      />
    </svg>
  ),
  rbac: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M12 2a5 5 0 015 5v1a5 5 0 01-10 0V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v1a3 3 0 106 0V7a3 3 0 00-3-3zm-7 11a1 1 0 011-1h12a1 1 0 011 1c0 2.5-1.5 5.5-7 5.5S5 17.5 5 15z"
      />
    </svg>
  ),
  github: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68.5.09.68-.23.68-.5 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.45-1.17-1.11-1.48-1.11-1.48-.91-.62.07-.61.07-.61 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.12-4.56-4.99 0-1.1.39-1.99 1.03-2.7-.1-.25-.45-1.28.1-2.67 0 0 .84-.27 2.75 1.03a9.3 9.3 0 012.5-.35c.85 0 1.7.12 2.5.35 1.9-1.3 2.74-1.03 2.74-1.03.55 1.39.2 2.42.1 2.67.64.7 1.03 1.6 1.03 2.7 0 3.88-2.34 4.73-4.57 4.99.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.68.5A10.06 10.06 0 0022 12.26C22 6.58 17.52 2 12 2z"
      />
    </svg>
  ),
  help: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 9.75a3.375 3.375 0 116.75 0c0 1.5-1.125 2.25-2.25 3s-1.125 1.5-1.125 2.25"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25h.007" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
};

const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-current">
    <path
      fill="currentColor"
      d="M12 7a5 5 0 110 10 5 5 0 010-10zm0-5a1 1 0 01.99.86L13 3v2a1 1 0 01-1.99.14L11 5V3a1 1 0 011-1zm0 18a1 1 0 01.99.86L13 21v2a1 1 0 01-1.99.14L11 23v-2a1 1 0 011-1zM4.22 5.64a1 1 0 011.41 0L6.99 7a1 1 0 01-1.32 1.5l-.1-.08-1.36-1.36a1 1 0 010-1.42zm12.73 12.73a1 1 0 011.41 0l1.36 1.36a1 1 0 01-1.32 1.5l-.1-.08-1.36-1.36a1 1 0 010-1.42zM1 12a1 1 0 01.86-.99L2 11h2a1 1 0 01.14 1.99L4 13H2a1 1 0 01-1-1zm18 0a1 1 0 01.99-.86L20 11h2a1 1 0 01.14 1.99L22 13h-2a1 1 0 01-1-1zm-13.78 5.64a1 1 0 011.32 1.5l-.1.08-1.36 1.36a1 1 0 01-1.5-1.32l.08-.1 1.36-1.36zm12.73-12.73a1 1 0 011.32 1.5l-.1.08-1.36 1.36a1 1 0 01-1.5-1.32l.08-.1 1.36-1.36z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-current">
    <path
      fill="currentColor"
      d="M12.06 2a.75.75 0 01.53.22 7.5 7.5 0 009.19 9.19.75.75 0 01.95.95A9 9 0 1111.83 1.47.75.75 0 0112.06 2zm-1.12 2.1A7.49 7.49 0 0021.9 12a7.5 7.5 0 01-10.96-7.9z"
    />
  </svg>
);

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
        icon: 'subnet'
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
      },
      {
        label: 'RBAC Calculator',
        href: '/tools/rbac-calculator',
        icon: 'rbac'
      }
    ]
  }
];

export default function Layout({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  breadcrumbs,
  toolSchema,
  children
}: LayoutProps) {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize dark mode with system preference if no stored value exists
  const getInitialDarkMode = () => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme-dark');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [isDarkMode, setIsDarkMode] = useLocalStorageBoolean('theme-dark', getInitialDarkMode());

  // Toggle dark class and theme-color meta tag when theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    document.documentElement.classList.toggle('dark', isDarkMode);

    // Update theme-color meta tag
    const themeColor = isDarkMode ? '#151515' : '#f1f5f9';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
  }, [isDarkMode]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router.asPath]);

  const meta = useMemo(() => {
    const pageTitle = title === DEFAULT_TITLE ? title : `${title} · Azure Hub`;
    // Use asPath for actual URL (not template), but strip query params and hash
    // This ensures canonical URLs work correctly for dynamic routes like /tools/service-tags/[serviceTag]
    const pathWithoutQuery = router.asPath.split('?')[0].split('#')[0];
    const cleanPath = pathWithoutQuery === '/' ? '/' : `${pathWithoutQuery}/`;
    const canonicalUrl = `https://azurehub.org${cleanPath}`;

    return {
      title: pageTitle,
      description,
      url: canonicalUrl,
      keywords
    };
  }, [description, keywords, router.asPath, title]);

  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Azure Hub',
      url: 'https://azurehub.org',
      description,
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://azurehub.org/tools/ip-lookup?ipOrDomain={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    }),
    [description]
  );

  const breadcrumbSchema = useMemo(() => {
    if (!breadcrumbs || breadcrumbs.length === 0) {
      return null;
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };
  }, [breadcrumbs]);

  const applicationSchema = useMemo(() => {
    if (!toolSchema) {
      return null;
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: toolSchema.name,
      applicationCategory: toolSchema.applicationCategory,
      operatingSystem: toolSchema.operatingSystem || 'Web Browser',
      offers: {
        '@type': 'Offer',
        price: toolSchema.offers?.price || '0',
        priceCurrency: toolSchema.offers?.priceCurrency || 'USD'
      },
      url: meta.url,
      description: description,
      author: {
        '@type': 'Organization',
        name: 'Azure Hub'
      }
    };
  }, [toolSchema, meta.url, description]);

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
        {meta.keywords.length > 0 && <meta name="keywords" content={meta.keywords.join(', ')} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={meta.url} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={meta.url} />
        <meta property="og:site_name" content="Azure Hub" />
        <meta property="og:image" content="https://azurehub.org/favicons/android-chrome-512x512.png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:alt" content="Azure Hub - Azure networking and identity tools" />
        <meta property="twitter:card" content="summary" />
        <meta property="twitter:title" content={meta.title} />
        <meta property="twitter:description" content={meta.description} />
        <meta property="twitter:image" content="https://azurehub.org/favicons/android-chrome-512x512.png" />
        {/* theme-color is set dynamically via inline script in _document.tsx to prevent flash */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {breadcrumbSchema && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        )}
        {applicationSchema && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(applicationSchema) }} />
        )}
      </Head>

      <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-[#151515] dark:text-slate-100">
        <div className="flex min-h-screen md:h-screen md:overflow-hidden">
          {/* Mobile menu backdrop */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar */}
          <aside
            className={`relative flex flex-col border-r border-slate-200 bg-white/95 backdrop-blur transition-all duration-200 ease-out dark:border-[#363638] dark:bg-[#1B1B1C]/95 ${
              isSidebarCollapsed ? 'w-20' : 'w-72'
            } ${
              isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 md:relative' : 'hidden md:flex'
            }`}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-5">
              <Link href="/" className="flex items-center gap-3" aria-label="Azure Hub home">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-[#1B1B1C]">
                  <Image
                    src="/favicons/favicon-32x32.png"
                    alt="Azure Hub logo"
                    width={24}
                    height={24}
                    priority
                    unoptimized
                  />
                </span>
                <span className={`text-lg font-semibold tracking-tight ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Azure Hub
                </span>
              </Link>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 dark:border-[#363638] dark:bg-[#2C2C2E] dark:text-slate-200 dark:hover:border-[#363638] dark:hover:text-slate-100"
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

            <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-6">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p
                    className={`px-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 ${
                      isSidebarCollapsed ? 'hidden' : 'block'
                    }`}
                  >
                    {section.label}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    {section.items.map((item) => {
                      const active = matchRoute(item.href);
                      const disabled = item.disabled;
                      const baseClasses =
                        'group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
                      const stateClasses = disabled
                        ? 'cursor-not-allowed text-slate-300 dark:text-slate-700'
                        : active
                        ? 'bg-sky-100 text-slate-900 dark:bg-[#0A84FF]/10 dark:text-[#0A84FF]'
                        : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#0A84FF]/5 dark:hover:text-slate-100';

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
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                              active
                                ? 'bg-[#0A84FF]/10 dark:bg-[#0A84FF]/10'
                                : 'bg-transparent dark:bg-transparent'
                            }`}
                          >
                            {ICONS[item.icon](active)}
                          </span>
                          <span className={`${isSidebarCollapsed ? 'hidden' : 'block'}`}>{item.label}</span>
                          {item.comingSoon && !isSidebarCollapsed && (
                            <span className="ml-auto text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                              Soon
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-slate-200 px-3 py-4 dark:border-[#363638]">
              <div
                className={`flex ${
                  isSidebarCollapsed
                    ? 'flex-col items-center gap-2'
                    : 'items-center justify-between gap-3'
                }`}
              >
                <div
                  className={`flex ${
                    isSidebarCollapsed ? 'flex-col items-center gap-2' : 'items-center gap-3'
                  }`}
                >
                  <Link
                    href="https://github.com/endgor/azure-hub"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open the Azure Hub GitHub repository in a new tab"
                    className="group inline-flex"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 transition-colors group-hover:border-sky-200 group-hover:bg-sky-50 group-hover:text-slate-900 dark:border-[#363638] dark:bg-[#2C2C2E] dark:text-[#0A84FF]/80 dark:group-hover:border-[#0A84FF]/30 dark:group-hover:bg-[#0A84FF]/10 dark:group-hover:text-[#0A84FF]">
                      {ICONS.github(false)}
                    </span>
                    <span className="sr-only">GitHub repository</span>
                  </Link>
                  <Link href="/about" aria-label="Learn more about Azure Hub" className="group inline-flex">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 transition-colors group-hover:border-sky-200 group-hover:bg-sky-50 group-hover:text-slate-900 dark:border-[#363638] dark:bg-[#2C2C2E] dark:text-[#0A84FF]/80 dark:group-hover:border-[#0A84FF]/30 dark:group-hover:bg-[#0A84FF]/10 dark:group-hover:text-[#0A84FF]">
                      {ICONS.help(false)}
                    </span>
                    <span className="sr-only">About Azure Hub</span>
                  </Link>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-slate-900 dark:border-[#363638] dark:bg-[#2C2C2E] dark:text-[#0A84FF]/80 dark:hover:border-[#0A84FF]/30 dark:hover:bg-[#0A84FF]/10 dark:hover:text-[#0A84FF]"
                  onClick={() => setIsDarkMode((prev) => !prev)}
                  aria-pressed={isDarkMode}
                  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? <MoonIcon /> : <SunIcon />}
                </button>
              </div>
            </div>
          </aside>

          <div className="flex flex-1 flex-col">
            {/* Mobile header with hamburger button */}
            <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 dark:border-[#363638] dark:bg-[#1B1B1C] md:hidden">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 dark:border-[#363638] dark:bg-[#2C2C2E] dark:text-slate-200 dark:hover:border-[#363638] dark:hover:text-slate-100"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 text-current"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/" className="flex items-center gap-2" aria-label="Azure Hub home">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-[#1B1B1C]">
                  <Image
                    src="/favicons/favicon-32x32.png"
                    alt="Azure Hub logo"
                    width={20}
                    height={20}
                    priority
                    unoptimized
                  />
                </span>
                <span className="text-base font-semibold tracking-tight">Azure Hub</span>
              </Link>
            </div>

            <main className="flex-1 overflow-auto px-4 py-6 md:px-6 md:py-10">
              <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
