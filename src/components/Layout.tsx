import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLocalStorageBoolean } from '@/hooks/useLocalStorageState';
import { useSwipeDrawer } from '@/hooks/useSwipeDrawer';
import { SEOHead } from './layout/SEOHead';
import { Sidebar, type NavSection } from './layout/Sidebar';

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

interface ArticleSchema {
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
}

interface LayoutProps {
  title?: string;
  description?: string;
  keywords?: string[];
  breadcrumbs?: BreadcrumbItem[];
  toolSchema?: ToolSchema;
  articleSchema?: ArticleSchema;
  canonicalUrl?: string; // Allow pages to override canonical URL for dynamic routes
  children: ReactNode;
}

const DEFAULT_TITLE = 'Azure Hub';
const DEFAULT_DESCRIPTION =
  'Azure Hub delivers Azure IP lookup, tenant discovery, service tag exploration, and subnet planning tools for cloud architects and administrators.';
const DEFAULT_KEYWORDS = [
  'Azure IP lookup',
  'Azure IP checker',
  'Azure IP ranges',
  'Azure tenant lookup',
  'Azure ID lookup',
  'Azure subnet calculator',
  'Azure service tags',
  'Azure RBAC calculator',
  'Azure RBAC roles',
  'Entra ID roles',
  'Microsoft Entra tools',
  'Azure networking tools'
];

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
        label: 'Azure RBAC Calculator',
        href: '/tools/azure-rbac-calculator',
        icon: 'rbac'
      },
      {
        label: 'Entra ID Roles Calculator',
        href: '/tools/entraid-roles-calculator',
        icon: 'entraId'
      }
    ]
  },
  {
    label: 'Resources',
    items: [
      {
        label: 'Guides',
        href: '/guides',
        icon: 'guides'
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
  articleSchema,
  canonicalUrl,
  children
}: LayoutProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSwipeOpen = useCallback(() => setIsMobileMenuOpen(true), []);
  const handleSwipeClose = useCallback(() => setIsMobileMenuOpen(false), []);

  useSwipeDrawer({
    isOpen: isMobileMenuOpen,
    onOpen: handleSwipeOpen,
    onClose: handleSwipeClose,
  });

  // Initialize dark mode - always start with false during SSR to avoid hydration mismatch
  // The actual preference will be applied after mount via useEffect
  const [isDarkMode, setIsDarkMode] = useLocalStorageBoolean('theme-dark', false);

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
    const handleRouteChange = () => setIsMobileMenuOpen(false);
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  const meta = useMemo(() => {
    const pageTitle = title === DEFAULT_TITLE ? title : `${title} · Azure Hub`;

    // Use provided canonicalUrl if available (for dynamic routes), otherwise auto-generate
    let finalCanonicalUrl: string;

    if (canonicalUrl) {
      // Page provided explicit canonical URL
      finalCanonicalUrl = canonicalUrl;
    } else {
      // Auto-generate from router.asPath, stripping query params and hash
      // Note: This works for static routes, but dynamic routes should pass explicit canonicalUrl
      const pathWithoutQuery = router.asPath.split('?')[0].split('#')[0];
      // Normalize trailing slash: remove existing one (if any) before appending
      const pathWithoutTrailingSlash = pathWithoutQuery.replace(/\/$/, '');
      const cleanPath = pathWithoutTrailingSlash === '' ? '/' : `${pathWithoutTrailingSlash}/`;
      finalCanonicalUrl = `https://azurehub.org${cleanPath}`;
    }

    return {
      title: pageTitle,
      description,
      url: finalCanonicalUrl,
      keywords
    };
  }, [description, keywords, router.asPath, title, canonicalUrl]);

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

  const articleStructuredData = useMemo(() => {
    if (!articleSchema) {
      return null;
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: articleSchema.headline,
      description: articleSchema.description,
      datePublished: articleSchema.datePublished,
      dateModified: articleSchema.dateModified || articleSchema.datePublished,
      author: {
        '@type': 'Organization',
        name: articleSchema.author || 'Azure Hub',
        url: 'https://azurehub.org'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Azure Hub',
        url: 'https://azurehub.org',
        logo: {
          '@type': 'ImageObject',
          url: 'https://azurehub.org/favicons/android-chrome-512x512.png'
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': meta.url
      }
    };
  }, [articleSchema, meta.url]);

  const matchRoute = (href: string) => {
    if (!href.startsWith('/')) {
      return false;
    }
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  // Prepare JSON-LD schemas array
  const jsonLd = useMemo(() => {
    const schemas: Array<Record<string, unknown>> = [structuredData];
    if (breadcrumbSchema) schemas.push(breadcrumbSchema);
    if (applicationSchema) schemas.push(applicationSchema);
    if (articleStructuredData) schemas.push(articleStructuredData);
    return schemas;
  }, [structuredData, breadcrumbSchema, applicationSchema, articleStructuredData]);

  return (
    <>
      <SEOHead
        title={meta.title}
        description={meta.description}
        url={meta.url}
        keywords={meta.keywords}
        jsonLd={jsonLd}
      />

      <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-[#151515] dark:text-slate-100">
        <div className="flex min-h-screen md:h-screen md:overflow-hidden">
          <Sidebar
            isMobileMenuOpen={isMobileMenuOpen}
            onMobileMenuClose={() => setIsMobileMenuOpen(false)}
            matchRoute={matchRoute}
            navSections={NAV_SECTIONS}
            isDarkMode={isDarkMode}
            onThemeToggle={() => setIsDarkMode((prev) => !prev)}
          />

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
