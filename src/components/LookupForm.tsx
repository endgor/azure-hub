import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/router';
import SearchInput from '@/components/shared/SearchInput';

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
    setSearchQuery(initialValue || initialService || initialRegion);
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
    <form onSubmit={handleSubmit} className="mb-6" role="search" aria-label="Azure IP Lookup">
      <label className="sr-only" htmlFor="search-query">
        Search Azure IP addresses, services, or regions
      </label>
      <SearchInput
        type="search"
        id="search-query"
        name="search-query"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Enter IP address, CIDR, service name, or region"
        maxWidth="sm"
        isLoading={isLoading}
        aria-label="Search query"
      />
    </form>
  );
});

export default LookupForm;
