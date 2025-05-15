'use client';

import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (command: string, action: string, params: any) => void;
  }
}

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function Analytics() {
  // Don't initialize analytics if GA ID is not set
  if (!GA_TRACKING_ID) {
    return <VercelAnalytics />;
  }
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      window.gtag?.('config', GA_TRACKING_ID, {
        page_path: url,
      });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
      <VercelAnalytics />
    </>
  );
}
