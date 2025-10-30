import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/router';

interface LookupFormProps {
  initialValue?: string;
  initialRegion?: string;
  initialService?: string;
}

const LookupForm = memo(function LookupForm({ 
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
      
      // List of known Azure regions patterns
      const regionPatterns = [
        /^(west|east|north|south|central|australia|brazil|canada|france|germany|india|japan|korea|norway|qatar|sweden|switzerland|uae|uk)/i
      ];
      
      // List of known Azure service prefixes
      const servicePatterns = [
        /^azure/i,
        /^sql/i,
        /^app/i,
        /^storage/i,
        /^key/i,
        /^api/i,
        /^cognitive/i,
        /^event/i
      ];
      
      // Check if it matches a region pattern
      const isRegion = regionPatterns.some(pattern => pattern.test(cleanedInput));
      
      // Check if it matches a service pattern
      const isService = servicePatterns.some(pattern => pattern.test(cleanedInput));
      
      if (isRegion && !isService) {
        // Clear region match and not a service
        query.region = cleanedInput;
      } else if (isService && !isRegion) {
        // Clear service match and not a region
        query.service = cleanedInput;
      } else {
        // If ambiguous or doesn't match patterns, let the backend handle both options
        // by searching both as service and region
        query.ipOrDomain = cleanedInput;
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
    <form onSubmit={handleSubmit} className="mb-6 w-full max-w-md" role="search" aria-label="Azure IP Lookup">
      <label className="sr-only" htmlFor="search-query">
        Search Azure IP addresses, services, or regions
      </label>
      <div className="relative">
        <input
          type="search"
          id="search-query"
          name="search-query"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter IP address, CIDR, service name, or region"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          aria-label="Search query"
        />
        <button
          type="submit"
          className={`absolute inset-y-0 right-0 flex items-center justify-center px-4 text-sky-500 transition hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200 ${
            isLoading ? 'cursor-wait opacity-70' : ''
          }`}
          disabled={isLoading}
          aria-label="Run lookup"
        >
          {isLoading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-500/60 border-t-transparent" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 21l-4.8-4.8m0 0A6 6 0 1010 16a6 6 0 006.2-4.6z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
});

export default LookupForm;
