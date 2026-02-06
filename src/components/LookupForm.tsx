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
  const derivedInitial = initialValue || initialService || initialRegion;
  const [searchQuery, setSearchQuery] = useState(derivedInitial);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [prevDerivedInitial, setPrevDerivedInitial] = useState(derivedInitial);

  // Update search query when initial values change (render-time state adjustment)
  if (derivedInitial !== prevDerivedInitial) {
    setPrevDerivedInitial(derivedInitial);
    setSearchQuery(derivedInitial);
  }

  // Reset loading state when route change completes
  useEffect(() => {
    const handleRouteChangeComplete = () => setIsLoading(false);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router.events]);

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
