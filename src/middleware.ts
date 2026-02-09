import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge Middleware: normalizes URLs to prevent duplicate-content indexing issues.
 * - Collapses consecutive slashes (/about// → /about/)
 * - Enforces trailing slash on non-file paths
 * - Returns 308 (permanent redirect, preserves method) when URL needs normalization
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let normalized = pathname;

  // Collapse consecutive slashes: //about/// → /about/
  normalized = normalized.replace(/\/{2,}/g, '/');

  // Enforce trailing slash on non-file paths (paths without a dot extension)
  if (!normalized.endsWith('/') && !normalized.includes('.')) {
    normalized = normalized + '/';
  }

  // Only redirect if the path actually changed
  if (normalized !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = normalized;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - _next/data (getServerSideProps JSON)
     * - api/ routes (handled by Next.js)
     * - Static assets with file extensions in public/
     */
    '/((?!_next/static|_next/image|_next/data|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|data/).*)',
  ],
};
