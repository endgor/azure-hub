import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
}

export default function Layout({ title = 'Azure IP Lookup', children }: LayoutProps) {
  const router = useRouter();
  const isActive = (path: string) => router.pathname === path;
  const fullTitle = `${title} - Find Azure Service IP Ranges`;
  const description = "Azure IP Lookup Tool helps you identify IP addresses and ranges associated with Azure services. Search by IP, CIDR, service name, or region to discover Azure infrastructure details.";
  const url = `https://azurehub.org${router.asPath}`;

  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        
        {/* Essential Meta Tags */}
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href={url} />
        <meta name="robots" content="index, follow" />
        
        {/* OpenGraph Meta Tags */}
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="Azure IP Lookup" />
        
        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        
        {/* Keywords */}
        <meta name="keywords" content="azure ip lookup, azure service tags, azure ip ranges, azure networking, azure infrastructure, cloud ip addresses, microsoft azure" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Azure IP Lookup",
            "description": description,
            "url": url,
            "applicationCategory": "Networking Tool",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Organization",
              "name": "Azure IP Lookup"
            }
          })}
        </script>
      </Head>
      
      <div className="min-h-screen flex flex-col">
        <header className="bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-4">
            <nav className="flex flex-col sm:flex-row justify-between items-center py-4">
              <Link href="/" className="flex items-center text-2xl font-bold mb-2 sm:mb-0" aria-label="Azure IP Lookup - Home">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-8 w-8 mr-2" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  role="img"
                  aria-label="Azure IP Lookup Logo"
                >
                  <path d="M21.3 12c0 .9-5.5 5.6-9.3 5.6S2.7 12.9 2.7 12s5.5-5.6 9.3-5.6c3.8-.1 9.3 4.7 9.3 5.6zm-9.3-3.5c1.9 0 3.5 1.6 3.5 3.5s-1.6 3.5-3.5 3.5-3.5-1.6-3.5-3.5 1.5-3.5 3.5-3.5z" />
                </svg>
                <span>Azure IP Lookup</span>
              </Link>
              
              <div className="flex items-center space-x-1">
                <Link 
                  href="/" 
                  className={`px-3 py-2 rounded-md font-medium text-sm ${
                    isActive('/') 
                      ? 'bg-blue-800 text-white' 
                      : 'text-blue-100 hover:bg-blue-600'
                  }`}
                >
                  Home
                </Link>
                
                <Link 
                  href="/about" 
                  className={`px-3 py-2 rounded-md font-medium text-sm ${
                    isActive('/about') 
                      ? 'bg-blue-800 text-white' 
                      : 'text-blue-100 hover:bg-blue-600'
                  }`}
                >
                  About
                </Link>
                
                <a 
                  href="https://github.com/endgor/azure-ip-lookup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-md text-sm font-medium text-blue-100 hover:bg-blue-600 flex items-center"
                >
                  <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
        
        <footer className="bg-gray-50 border-t">
          <div className="container mx-auto px-4 py-6 text-center text-gray-600">
            <p className="font-medium">Azure IP Lookup Tool</p>
            <p className="text-sm mt-1 mb-2">
              Data automatically updates daily from Microsoft's official sources
            </p>
            <div className="flex justify-center space-x-4 text-sm">
              <a 
                href="https://www.microsoft.com/en-us/download/details.aspx?id=56519"
                className="text-blue-600 hover:underline"
                target="_blank" 
                rel="noopener noreferrer"
              >
                Official Data Source
              </a>
              <span className="text-gray-400">|</span>
              <Link href="/about" className="text-blue-600 hover:underline">
                About
              </Link>
              <span className="text-gray-400">|</span>
              <a 
                href="https://github.com/endgor/azure-ip-lookup"
                className="text-blue-600 hover:underline"
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
