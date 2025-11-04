import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  // Organization Schema for Google Knowledge Graph
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Azure Hub',
    url: 'https://azurehub.org',
    logo: 'https://azurehub.org/favicons/android-chrome-512x512.png',
    description: 'Azure Hub delivers Azure IP lookup, tenant discovery, service tag exploration, and subnet planning tools for cloud architects and administrators.',
    sameAs: [
      'https://github.com/endgor/azure-hub'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Technical Support',
      url: 'https://github.com/endgor/azure-hub/issues'
    }
  };

  return (
    <Html lang="en">
      <Head>
        <meta
          name="keywords"
          content="Azure Hub, Azure networking tools, Azure IP lookup, Azure service tags, tenant insights, subnet calculator, Microsoft Azure diagnostics, Azure RBAC calculator, Azure RBAC generator, Azure role generator, tenant lookup, Microsoft Entra"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {/* No-flash script: Set dark class before React hydrates to prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isDark = localStorage.getItem('theme-dark') === 'true';
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </Head>
      <body className="bg-slate-100">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
