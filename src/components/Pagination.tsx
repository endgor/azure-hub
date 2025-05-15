import React from 'react';
import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  query: {
    ipOrDomain?: string;
    region?: string;
    service?: string;
  };
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  query
}) => {
  // Determine which page links to show
  const getPageNumbers = () => {
    const pages = [];
    const MAX_VISIBLE = 5;
    
    // Always show first page
    pages.push(1);
    
    if (totalPages <= MAX_VISIBLE) {
      // If we have 5 or fewer pages, show all of them
      for (let i = 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // More complex case with ellipsis
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      if (startPage > 2) pages.push(-1); // Add ellipsis after 1
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages - 1) pages.push(-2); // Add ellipsis before last page
      
      // Always show last page if we have more than 1 page
      if (totalPages > 1) pages.push(totalPages);
    }
    
    return pages;
  };
  
  // Helper to build URL with query params
  const getPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (query.ipOrDomain) params.append('ipOrDomain', query.ipOrDomain);
    if (query.region) params.append('region', query.region);
    if (query.service) params.append('service', query.service);
    if (page > 1) params.append('page', page.toString());
    
    return `/?${params.toString()}`;
  };
  
  // Don't render pagination if we only have one page
  if (totalPages <= 1) return null;
  
  // Calculate range of items being shown
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  // Get pages to display
  const pageNumbers = getPageNumbers();
  
  return (
    <div className="py-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
      <div className="text-sm text-gray-600">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </div>
      
      <nav className="flex items-center space-x-1">
        {/* Previous button */}
        {currentPage > 1 && (
          <Link href={getPageUrl(currentPage - 1)} className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
            Previous
          </Link>
        )}
        
        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page < 0) {
            // Ellipsis
            return <span key={`ellipsis-${index}`} className="px-3 py-1">...</span>;
          }
          
          return (
            <Link
              key={page}
              href={getPageUrl(page)}
              className={`px-3 py-1 rounded-md text-sm ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {page}
            </Link>
          );
        })}
        
        {/* Next button */}
        {currentPage < totalPages && (
          <Link href={getPageUrl(currentPage + 1)} className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
            Next
          </Link>
        )}
      </nav>
    </div>
  );
};

export default Pagination;
