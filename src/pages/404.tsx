import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Custom404() {
  return (
    <Layout title="Page Not Found - 404 Error">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-600 mb-6">Page Not Found</h2>
          <p className="text-lg text-gray-500 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-8 mb-8">
          <h3 className="text-xl font-semibold text-blue-800 mb-4">What can you do instead?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link 
              href="/"
              className="block bg-white border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h4 className="font-medium text-blue-800 mb-2">Search IP Addresses</h4>
              <p className="text-sm text-gray-600">Find Azure IP ranges and service tags</p>
            </Link>
            
            <Link 
              href="/service-tags"
              className="block bg-white border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h4 className="font-medium text-blue-800 mb-2">Browse Service Tags</h4>
              <p className="text-sm text-gray-600">Explore all Azure Service Tags</p>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <Link 
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Go Back to Home
          </Link>
          
          <div className="text-sm text-gray-500">
            <p>If you believe this is an error, please check the URL or contact us through our 
            <a 
              href="https://github.com/endgor/azure-ip-lookup/issues" 
              className="text-blue-600 hover:underline ml-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}