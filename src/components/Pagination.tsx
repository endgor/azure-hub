import React from 'react';
import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  isAll?: boolean;
  basePath?: string;
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
  basePath = '/',
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

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  const getAllUrl = () => {
    const params = new URLSearchParams();
    if (query?.ipOrDomain) params.append('ipOrDomain', query.ipOrDomain);
    if (query?.region) params.append('region', query.region);
    if (query?.service) params.append('service', query.service);
    params.append('pageSize', 'all');

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
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
    <nav
      className="my-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm md:flex-row md:items-center md:justify-between"
      aria-label="Search results pagination"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div className="text-slate-600">
          Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
          <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalItems}</span>
        </div>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor={`pageSize-${position}`} className="text-xs uppercase tracking-wide text-slate-500">
              Items
            </label>
            <select
              id={`pageSize-${position}`}
              value={isAll ? 'all' : pageSize}
              onChange={(e) => {
                const value = e.target.value;
                onPageSizeChange(value === 'all' ? 'all' : parseInt(value, 10));
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All' : option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 md:justify-end" role="navigation" aria-label="Pagination">
        {/* Previous button */}
        {!isAll && currentPage > 1 && (
          onPageChange ? (
            <button
              onClick={() => onPageChange(currentPage - 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
            >
              Previous
            </button>
          ) : (
            <Link
              href={getPageUrl(currentPage - 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
            >
              Previous
            </Link>
          )
        )}
        
        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page < 0) {
            // Ellipsis
            return <span key={`ellipsis-${index}`} className="px-3 py-2 text-slate-600">...</span>;
          }
          
          return (
            onPageChange ? (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  !isAll && currentPage === page
                    ? 'border border-sky-400 bg-sky-50 text-sky-700'
                    : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700'
                }`}
              >
                {page}
              </button>
            ) : (
              <Link
                key={page}
                href={getPageUrl(page)}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  !isAll && currentPage === page
                    ? 'border border-sky-400 bg-sky-50 text-sky-700'
                    : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700'
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
            className={`rounded-lg px-3 py-2 text-sm transition ${
              isAll
                ? 'border border-sky-400 bg-sky-50 text-sky-700'
                : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700'
            }`}
          >
            All
          </button>
        ) : (
          <Link
            href={getAllUrl()}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              isAll
                ? 'border border-sky-400 bg-sky-50 text-sky-700'
                : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700'
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
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
            >
              Next
            </button>
          ) : (
            <Link
              href={getPageUrl(currentPage + 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
            >
              Next
            </Link>
          )
        )}
      </div>
    </nav>
  );
};

export default Pagination;
