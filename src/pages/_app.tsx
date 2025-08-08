// filepath: /Users/ender/Projects/azure-ip-lookup/src/pages/_app.tsx
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Azure IP Lookup Tool - Check if an IP belongs to Azure" />
      </Head>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
