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
          content="Azure Hub, Azure networking tools, Azure IP lookup, Azure service tags, tenant insights, azure subnet calculator, subnet calculator, Microsoft Azure diagnostics, Azure RBAC calculator, Azure RBAC generator, Azure role generator, azure rbac least privilege, Entra ID roles calculator, entra id least privilege, directory roles, Azure AD roles, tenant lookup, Microsoft Entra"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {/* No-flash script: Set dark class and theme-color before React hydrates to prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme-dark');
                  var isDark = stored === 'true';

                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }

                  // Set theme-color meta tag immediately to prevent flash
                  var themeColor = isDark ? '#151515' : '#f1f5f9';
                  var metaThemeColor = document.querySelector('meta[name="theme-color"]');
                  if (metaThemeColor) {
                    metaThemeColor.setAttribute('content', themeColor);
                  } else {
                    var meta = document.createElement('meta');
                    meta.name = 'theme-color';
                    meta.content = themeColor;
                    document.head.appendChild(meta);
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
