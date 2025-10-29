/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
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
    optimizePackageImports: ['ip-cidr', 'papaparse'],
  },
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
}

module.exports = withBundleAnalyzer(nextConfig)
