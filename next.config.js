/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  trailingSlash: true,
  reactStrictMode: true,
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  poweredByHeader: false,
  generateEtags: true,
  compress: true,

  // Security headers
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    return [
      {
        // Apply security headers to all routes.
        // Note: service-tag indexing is controlled per page via the <meta name="robots">
        // tag (base tags are indexed, regional variants are noindexed) rather than a
        // blanket X-Robots-Tag header, so base tags can be indexed and crawlers can
        // read the noindex on variants instead of being blocked from them.
        source: '/:path*',
        headers: [
          // Strict Transport Security - force HTTPS for 2 years
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Restrict browser features and APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Content Security Policy - stricter in production
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // unsafe-eval only needed for Next.js dev mode
              // static.cloudflareinsights.com hosts the Web Analytics beacon
              `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com ${isProd ? '' : "'unsafe-eval' "}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              // cloudflareinsights.com receives Web Analytics beacon submissions
              "connect-src 'self' https://cloudflareinsights.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  },

  // Redirects for backward compatibility and SEO.
  // Note: www → apex redirect lives in Cloudflare Redirect Rules because
  // Next.js' host-based redirects emit a literal ":path*" in the Location
  // header when run under OpenNext.
  async redirects() {
    return [
      // Legacy URL redirects
      {
        source: '/tools/rbac-calculator',
        destination: '/tools/azure-rbac-calculator',
        permanent: true,
      },
      {
        source: '/tools/rbac-calculator/',
        destination: '/tools/azure-rbac-calculator/',
        permanent: true,
      },
      {
        // Regional service-tag variants (e.g. /tools/service-tags/Storage.WestEurope) are
        // consolidated into the base tag page as a region filter. Redirect any tag segment
        // containing a dot to its base page. ":base" captures the name up to the first dot.
        source: '/tools/service-tags/:base([^/.]+).:rest(.*)',
        destination: '/tools/service-tags/:base/',
        permanent: true,
      },
      {
        source: '/service-tags',
        destination: '/tools/service-tags/',
        permanent: true,
      },
      {
        source: '/service-tags/',
        destination: '/tools/service-tags/',
        permanent: true,
      },
      {
        source: '/service-tags/:serviceTag',
        destination: '/tools/service-tags/:serviceTag/',
        permanent: true,
      },
      {
        source: '/service-tags/:serviceTag/',
        destination: '/tools/service-tags/:serviceTag/',
        permanent: true,
      }
    ];
  }
}

module.exports = withBundleAnalyzer(nextConfig)
