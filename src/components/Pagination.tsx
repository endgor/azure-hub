import React from 'react';
import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  isAll?: boolean;
  query?: {
    ipOrDomain?: string;
    region?: string;
    service?: string;
  };
  onPageSizeChange?: (size: number | 'all') => void;
  position?: 'top' | 'bottom';
  onPageChange?: (page: number | 'all') => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  query,
  isAll = false,
  onPageSizeChange,
  position = 'bottom',
  onPageChange
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
    if (query?.ipOrDomain) params.append('ipOrDomain', query.ipOrDomain);
    if (query?.region) params.append('region', query.region);
    if (query?.service) params.append('service', query.service);
    if (page > 1) params.append('page', page.toString());

    return `/?${params.toString()}`;
  };

  const getAllUrl = () => {
    const params = new URLSearchParams();
    if (query?.ipOrDomain) params.append('ipOrDomain', query.ipOrDomain);
    if (query?.region) params.append('region', query.region);
    if (query?.service) params.append('service', query.service);
    params.append('pageSize', 'all');

    return `/?${params.toString()}`;
  };
  
  // Don't render pagination if we only have one page
  if (totalPages <= 1) return null;
  
  // Calculate range of items being shown
  const startItem = isAll ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = isAll ? totalItems : Math.min(currentPage * pageSize, totalItems);
  
  // Get pages to display
  const pageNumbers = getPageNumbers();
  
  const pageSizeOptions = [10, 20, 50, 100, 200, 'all'] as const;

  return (
    <nav className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 my-6 px-2" aria-label="Search results pagination">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-700">
        <div>
          Showing items <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{totalItems}</span>
        </div>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor={`pageSize-${position}`} className="text-sm text-gray-600">Items per page:</label>
            <select
              id={`pageSize-${position}`}
              value={isAll ? 'all' : pageSize}
              onChange={(e) => {
                const value = e.target.value;
                onPageSizeChange(value === 'all' ? 'all' : parseInt(value, 10));
              }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              {pageSizeOptions.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All' : option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center sm:justify-end gap-2" role="navigation" aria-label="Pagination">
        {/* Previous button */}
        {!isAll && currentPage > 1 && (
          onPageChange ? (
            <button
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Previous
            </button>
          ) : (
            <Link href={getPageUrl(currentPage - 1)} className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
              Previous
            </Link>
          )
        )}
        
        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page < 0) {
            // Ellipsis
            return <span key={`ellipsis-${index}`} className="px-3 py-1">...</span>;
          }
          
          return (
            onPageChange ? (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 rounded-md text-sm ${
                  !isAll && currentPage === page
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ) : (
              <Link
                key={page}
                href={getPageUrl(page)}
                className={`px-3 py-1 rounded-md text-sm ${
                  !isAll && currentPage === page
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page}
              </Link>
            )
          );
        })}

        {/* All option */}
        {onPageChange ? (
          <button
            onClick={() => onPageChange('all')}
            className={`px-3 py-1 rounded-md text-sm ${
              isAll ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
        ) : (
          <Link
            href={getAllUrl()}
            className={`px-3 py-1 rounded-md text-sm ${
              isAll ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </Link>
        )}

        {/* Next button */}
        {!isAll && currentPage < totalPages && (
          onPageChange ? (
            <button
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Next
            </button>
          ) : (
            <Link href={getPageUrl(currentPage + 1)} className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
              Next
            </Link>
          )
        )}
      </div>
    </nav>
  );
};

export default Pagination;
