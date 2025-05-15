import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface LookupFormProps {
  initialValue?: string;
  initialRegion?: string;
  initialService?: string;
}

export default function LookupForm({ 
  initialValue = '', 
  initialRegion = '',
  initialService = ''
}: LookupFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  // Set initial query on component load
  useEffect(() => {
    // Prioritize showing a simple value in this order: IP/domain -> service -> region
    if (initialValue) {
      setSearchQuery(initialValue);
    } else if (initialService) {
      setSearchQuery(initialService);
    } else if (initialRegion) {
      setSearchQuery(initialRegion);
    }
  }, [initialValue, initialRegion, initialService]);
  
  // Reset loading state when query parameters change
  useEffect(() => {
    setIsLoading(false);
  }, [router.query]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    
    // Clean up the input - standardize spaces
    const cleanedInput = searchQuery.trim().replace(/\s+/g, ' ');
    
    // Determine query type based on input format
    const query: Record<string, string> = {};
    
    // Check if it's a CIDR notation (has a slash followed by numbers)
    if (/\/\d+$/.test(cleanedInput)) {
      query.ipOrDomain = cleanedInput;
    }
    // Check if input looks like an IP address (at least one number with dots)
    else if (/^\d+\.\d+/.test(cleanedInput)) {
      query.ipOrDomain = cleanedInput;
    }
    // Check if input has a dot and might be a domain or Service.Region format
    else if (cleanedInput.includes('.')) {
      const parts = cleanedInput.split('.');
      
      // If it looks like Service.Region (e.g., Storage.WestEurope)
      if (parts.length === 2 && /^[a-zA-Z][a-zA-Z0-9]*$/.test(parts[0]) && /^[a-zA-Z][a-zA-Z0-9]*$/.test(parts[1])) {
        query.service = parts[0];
        query.region = parts[1];
      } else {
        // Treat as a domain name
        query.ipOrDomain = cleanedInput;
      }
    }
    // Check if it matches known region naming pattern (just letters and numbers)
    else if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(cleanedInput)) {
      // This could be either a service tag or region name
      // We'll let the backend determine which one it is
      
      // For regions like WestEurope or eastus, we'll try to detect capitalization pattern
      if (cleanedInput.match(/^[A-Z][a-z]+[A-Z][a-z]+$/)) {
        // CamelCase format like "WestEurope" suggests a region
        query.region = cleanedInput;
      } else if (cleanedInput.match(/^[a-z]+[a-z]+$/)) {
        // all lowercase like "westeurope" suggests a region
        query.region = cleanedInput;
      } else {
        // Default to service tag for other patterns like "Storage" or "AzureActiveDirectory"
        query.service = cleanedInput;
      }
    } else {
      // For anything else, just pass it as ipOrDomain
      query.ipOrDomain = cleanedInput;
    }
    
    // Navigate to the same page with query params
    router.push({
      pathname: router.pathname,
      query
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-8">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter IP address, CIDR, service name, or region"
          className="flex-grow border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search query"
        />
        <button 
          type="submit" 
          className={`bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors ${
            isLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Lookup'}
        </button>
      </div>
      
      <div className="mb-2">
        <p className="text-gray-500 text-sm">
          Examples: 40.112.127.224, 10.0.0.0/24, AzureActiveDirectory, WestEurope, Storage.WestEurope
        </p>
      </div>
    </form>
  );
}
