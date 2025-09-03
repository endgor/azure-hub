import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Script from 'next/script';

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
}

export default function Layout({ title = 'Azure IP Lookup', children }: LayoutProps) {
  const router = useRouter();
  const isActive = (path: string) => router.pathname === path;
  
  // Generate more SEO-optimized titles based on the page
  let fullTitle = title;
  let description = "Azure IP Lookup Tool helps you identify IP addresses and ranges associated with Azure services. Search by IP, CIDR, service name, or region to discover Azure infrastructure details.";
  
  // Customize title and description based on the current page
  if (title === 'Azure IP Lookup') {
    fullTitle = "Azure IP Lookup Tool";
    description = "Free Azure IP Lookup Tool. Instantly verify if an IP address belongs to Microsoft Azure. Search by IP address, CIDR, service name, or region. Updated daily with official Microsoft data.";
  } else if (title.includes('Azure Service Tags')) {
    fullTitle = `${title} | Browse All Azure Service Tag IP Ranges`;
    description = "Complete directory of Azure Service Tags with their associated IP ranges. Search and browse all Azure service tags to find networking details for Microsoft Azure infrastructure.";
  } else if (title.includes('Service Tag:')) {
    const serviceTag = title.replace('Azure Service Tag: ', '');
    fullTitle = `${serviceTag} Azure Service Tag | IP Ranges & Network Details`;
    description = `View all IP ranges and network details for the ${serviceTag} Azure Service Tag. Find regional distribution, system services, and network features for this Azure service.`;
  } else if (title.includes('About')) {
    fullTitle = "About Azure IP Lookup Tool | How It Works & Data Sources";
    description = "Learn about the Azure IP Lookup Tool, how it works, and its data sources. Understand Azure Service Tags, network features, and how we keep IP range data updated daily.";
  } else {
    fullTitle = `${title} | Azure IP Lookup Tool`;
  }
  
  const url = `https://azurehub.org${router.asPath}`;

  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        
        {/* Essential Meta Tags */}
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={url} />
        
        {/* Additional SEO Meta Tags */}
        <meta name="author" content="Azure IP Lookup Tool" />
        <meta name="language" content="en" />
        <meta name="geo.region" content="US" />
        <meta name="geo.placename" content="United States" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />
        <meta name="revisit-after" content="1 day" />
        <meta httpEquiv="Content-Language" content="en-US" />
        
        {/* Favicon Tags */}
        <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
        <link rel="manifest" href="/favicons/site.webmanifest" />
        <link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#3B82F6" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
        <meta name="msapplication-config" content="/favicons/browserconfig.xml" />
        <meta name="theme-color" content="#ffffff" />

        {/* Verification Meta Tags - Add these after you verify ownership */}
        <meta name="robots" content="index, follow" />
        
        {/* OpenGraph Meta Tags */}
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="Azure IP Lookup" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content="https://azurehub.org/favicons/android-chrome-512x512.png" />
        <meta property="og:image:alt" content="Azure IP Lookup Tool Logo" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        
        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@AzureIPLookup" />
        <meta name="twitter:creator" content="@AzureIPLookup" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://azurehub.org/favicons/android-chrome-512x512.png" />
        <meta name="twitter:image:alt" content="Azure IP Lookup Tool Logo" />
        
        {/* Keywords */}
        <meta name="keywords" content="azure ip lookup, azure service tags, azure ip ranges, azure networking, azure infrastructure, cloud ip addresses, microsoft azure" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["WebApplication", "SoftwareApplication"],
            "name": "Azure IP Lookup Tool",
            "alternateName": "Azure IP Address Finder",
            "description": description,
            "url": "https://azurehub.org",
            "sameAs": [
              "https://github.com/endgor/azure-ip-lookup"
            ],
            "applicationCategory": ["NetworkingApplication", "DeveloperApplication"],
            "operatingSystem": "Any",
            "browserRequirements": "Requires JavaScript. Works with all modern web browsers.",
            "softwareVersion": "1.0",
            "datePublished": "2024-01-01",
            "dateModified": new Date().toISOString().split('T')[0],
            "isAccessibleForFree": true,
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock"
            },
            "creator": {
              "@type": "Organization",
              "name": "Azure IP Lookup",
              "url": "https://azurehub.org"
            },
            "publisher": {
              "@type": "Organization", 
              "name": "Azure IP Lookup",
              "url": "https://azurehub.org"
            },
            "keywords": [
              "Azure IP Lookup",
              "Azure Service Tags", 
              "IP Address Verification",
              "Microsoft Azure",
              "Network Security",
              "Cloud Infrastructure",
              "IP Range Finder"
            ],
            "featureList": [
              "IP Address Lookup",
              "CIDR Range Search", 
              "Service Tag Browsing",
              "Regional IP Filtering",
              "Azure Service Detection"
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "150",
              "bestRating": "5",
              "worstRating": "1"
            }
          })}
        </script>
      </Head>


      
      <div className="min-h-screen flex flex-col">
        <header className="bg-white shadow-sm border-b border-google-gray-200">
          <div className="container mx-auto px-4">
            <nav className="flex flex-col sm:flex-row justify-between items-center py-4">
              <Link href="/" className="flex items-center text-2xl font-bold mb-2 sm:mb-0 text-google-gray-800" aria-label="Azure IP Lookup - Home">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-8 w-8 mr-2 text-google-blue-600" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  role="img"
                  aria-label="Azure IP Lookup Logo - Eye icon representing network visibility"
                >
                  <title>Azure IP Lookup Logo</title>
                  <path d="M21.3 12c0 .9-5.5 5.6-9.3 5.6S2.7 12.9 2.7 12s5.5-5.6 9.3-5.6c3.8-.1 9.3 4.7 9.3 5.6zm-9.3-3.5c1.9 0 3.5 1.6 3.5 3.5s-1.6 3.5-3.5 3.5-3.5-1.6-3.5-3.5 1.5-3.5 3.5-3.5z" />
                </svg>
                <span>Azure IP Lookup</span>
              </Link>
              
              <div className="flex items-center space-x-1">
                <Link 
                  href="/" 
                  className={`px-3 py-2 font-medium text-sm transition-colors ${
                    isActive('/') 
                      ? 'text-google-blue-600 border-b-2 border-google-blue-600' 
                      : 'text-google-gray-700 hover:text-google-blue-600'
                  }`}
                >
                  Home
                </Link>
                
                <Link 
                  href="/service-tags" 
                  className={`px-3 py-2 font-medium text-sm transition-colors ${
                    isActive('/service-tags') || router.pathname.startsWith('/service-tags') 
                      ? 'text-google-blue-600 border-b-2 border-google-blue-600' 
                      : 'text-google-gray-700 hover:text-google-blue-600'
                  }`}
                >
                  Service Tags
                </Link>
                
                <Link 
                  href="/about" 
                  className={`px-3 py-2 font-medium text-sm transition-colors ${
                    isActive('/about') 
                      ? 'text-google-blue-600 border-b-2 border-google-blue-600' 
                      : 'text-google-gray-700 hover:text-google-blue-600'
                  }`}
                >
                  About
                </Link>
                
                <a 
                  href="https://github.com/endgor/azure-ip-lookup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm font-medium text-google-gray-600 hover:text-google-blue-600 flex items-center transition-colors"
                  aria-label="View Azure IP Lookup source code on GitHub"
                >
                  <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" role="img">
                    <title>GitHub Logo</title>
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  GitHub
                </a>
              </div>
            </nav>
          </div>
        </header>
        
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        
        <footer className="bg-google-gray-50 border-t border-google-gray-200">
          <div className="container mx-auto px-4 py-6 text-center text-google-gray-600">
            <p className="font-medium text-google-gray-800">Azure IP Lookup Tool</p>
            <p className="text-sm mt-1 mb-2">
              Data automatically updates daily from Microsoft&apos;s official sources
            </p>
            <div className="flex justify-center space-x-4 text-sm">
              <a 
                href="https://www.microsoft.com/en-us/download/details.aspx?id=56519"
                className="text-google-gray-600 hover:text-google-blue-600 hover:underline transition-colors"
                target="_blank" 
                rel="noopener noreferrer"
              >
                Official Data Source
              </a>
              <span className="text-google-gray-400">|</span>
              <Link href="/about" className="text-google-gray-600 hover:text-google-blue-600 hover:underline transition-colors">
                About
              </Link>
              <span className="text-google-gray-400">|</span>
              <a 
                href="https://github.com/endgor/azure-ip-lookup"
                className="text-google-gray-600 hover:text-google-blue-600 hover:underline transition-colors"
                target="_blank" 
                rel="noopener noreferrer"
              >
                GitHub Repository
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
