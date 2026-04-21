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
        // Tell crawlers to skip all service tag detail pages via HTTP header
        // (saves crawl budget vs requiring HTML rendering to discover the meta noindex)
        source: '/tools/service-tags/:tag([^/]+)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow'
          }
        ]
      },
      {
        // Apply security headers to all routes
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
              `script-src 'self' 'unsafe-inline' ${isProd ? '' : "'unsafe-eval' "}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  },

  // Redirects for backward compatibility and SEO
  async redirects() {
    return [
      // Redirect www to non-www (canonical domain)
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.azurehub.org',
          },
        ],
        destination: 'https://azurehub.org/:path*',
        permanent: true,
      },
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
