import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/router';
import SearchInput from '@/components/shared/SearchInput';
import { classifySearchInput } from '@/lib/utils/searchClassifier';

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

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);

    // Classify the input using the utility function
    const query = classifySearchInput(searchQuery);

    // Navigate to the same page with query params
    router.push({
      pathname: router.pathname,
      query
    });
  }, [searchQuery, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await performSearch();
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
        onIconClick={performSearch}
      />
    </form>
  );
});

export default LookupForm;
