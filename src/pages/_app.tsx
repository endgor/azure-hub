import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta
          name="description"
          content="Azure Hub unifies Azure IP lookup, service tag exploration, and upcoming diagnostics tools under one interface."
        />
      </Head>
      <div className={`${inter.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
