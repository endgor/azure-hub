import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // When a new deployment goes live, clients with cached HTML reference
    // old _next/data and _next/static assets that no longer exist, causing
    // ChunkLoadError. Detect this and reload to pick up the new build.
    const STORAGE_KEY = 'chunk-reload-ts';
    const COOLDOWN_MS = 10_000;

    const shouldReload = () => {
      const last = sessionStorage.getItem(STORAGE_KEY);
      if (last && Date.now() - Number(last) < COOLDOWN_MS) return false;
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
      return true;
    };

    const isChunkError = (err: { name?: string; message?: string } | null) =>
      err?.name === 'ChunkLoadError' || err?.message?.includes('Loading chunk');

    const handleRouteError = (err: Error) => {
      if (isChunkError(err) && shouldReload()) {
        window.location.href = router.asPath;
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (isChunkError(event.error ?? { message: event.message }) && shouldReload()) {
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason) && shouldReload()) {
        window.location.reload();
      }
    };

    router.events.on('routeChangeError', handleRouteError);
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      router.events.off('routeChangeError', handleRouteError);
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [router]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={`${inter.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
