/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  reactStrictMode: true,
  swcMinify: true,
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // SEO and Performance optimizations
  experimental: {
    optimizePackageImports: ['swr', 'ip-cidr', 'papaparse', 'xlsx'],
  },
  poweredByHeader: false,
  generateEtags: true,
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  compress: true,
  // Headers configuration disabled for static export
  // Will be handled by staticwebapp.config.json for Azure Static Web Apps
  ...(process.env.NODE_ENV !== 'production' && {
    async headers() {
      return [
        {
          // Cache static assets more aggressively
          source: '/data/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=86400, stale-while-revalidate=43200', // Cache for 24 hours, stale for 12 hours
            },
          ],
        },
        {
          // Cache API routes with shorter TTL
          source: '/api/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=3600, stale-while-revalidate=1800', // Cache for 1 hour, stale for 30 min
            },
          ],
        },
        {
          // Default cache for other routes
          source: '/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=3600', // Cache for 1 hour
            },
          ],
        },
      ];
    },
  }),
}

module.exports = withBundleAnalyzer(nextConfig)
