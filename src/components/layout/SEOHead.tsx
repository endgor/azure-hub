import Head from 'next/head';

interface SEOHeadProps {
  title: string;
  description: string;
  url: string;
  keywords?: string[];
  jsonLd?: Array<Record<string, unknown>>;
}

export function SEOHead({ title, description, url, keywords, jsonLd }: SEOHeadProps) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={url} />

      {/* Favicons */}
      <link rel="icon" type="image/x-icon" href="/favicons/favicon.ico" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png" />
      <link rel="manifest" href="/favicons/site.webmanifest" />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Azure Hub" />
      <meta property="og:image" content="https://azurehub.org/favicons/android-chrome-512x512.png" />
      <meta property="og:image:width" content="512" />
      <meta property="og:image:height" content="512" />
      <meta property="og:image:alt" content="Azure Hub - Azure networking and identity tools" />

      {/* Twitter Card */}
      <meta property="twitter:card" content="summary" />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content="https://azurehub.org/favicons/android-chrome-512x512.png" />

      {/* Structured Data */}
      {jsonLd?.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
    </Head>
  );
}
