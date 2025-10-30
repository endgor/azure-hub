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
      className="my-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 shadow-sm md:my-6 md:flex-row md:items-center md:justify-between md:px-4 md:py-4 dark:border-slate-700 dark:bg-slate-900"
      aria-label="Search results pagination"
    >
      <div className="flex flex-col gap-2 text-xs md:flex-row md:items-center md:gap-4 md:text-sm">
        <div className="text-slate-600 dark:text-slate-300">
          Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{startItem}</span> to{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{endItem}</span> of{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{totalItems}</span>
        </div>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor={`pageSize-${position}`} className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Items
            </label>
            <select
              id={`pageSize-${position}`}
              value={isAll ? 'all' : pageSize}
              onChange={(e) => {
                const value = e.target.value;
                onPageSizeChange(value === 'all' ? 'all' : parseInt(value, 10));
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 md:px-3 md:py-2 md:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
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

      <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 md:justify-end" role="navigation" aria-label="Pagination">
        {/* Previous button */}
        {!isAll && currentPage > 1 && (
          onPageChange ? (
            <button
              onClick={() => onPageChange(currentPage - 1)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 md:px-3 md:py-2 md:text-sm dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              Previous
            </button>
          ) : (
            <Link
              href={getPageUrl(currentPage - 1)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 md:px-3 md:py-2 md:text-sm dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              Previous
            </Link>
          )
        )}

        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page < 0) {
            // Ellipsis
            return <span key={`ellipsis-${index}`} className="px-2 py-1.5 text-xs text-slate-600 md:px-3 md:py-2 md:text-sm dark:text-slate-400">...</span>;
          }

          return (
            onPageChange ? (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`rounded-lg px-2.5 py-1.5 text-xs transition md:px-3 md:py-2 md:text-sm ${
                  !isAll && currentPage === page
                    ? 'border border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-900/40 dark:text-sky-300'
                    : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300'
                }`}
              >
                {page}
              </button>
            ) : (
              <Link
                key={page}
                href={getPageUrl(page)}
                className={`rounded-lg px-2.5 py-1.5 text-xs transition md:px-3 md:py-2 md:text-sm ${
                  !isAll && currentPage === page
                    ? 'border border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-900/40 dark:text-sky-300'
                    : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300'
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
            className={`rounded-lg px-2.5 py-1.5 text-xs transition md:px-3 md:py-2 md:text-sm ${
              isAll
                ? 'border border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-900/40 dark:text-sky-300'
                : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300'
            }`}
          >
            All
          </button>
        ) : (
          <Link
            href={getAllUrl()}
            className={`rounded-lg px-2.5 py-1.5 text-xs transition md:px-3 md:py-2 md:text-sm ${
              isAll
                ? 'border border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-900/40 dark:text-sky-300'
                : 'border border-slate-300 text-slate-600 hover:border-sky-200 hover:text-sky-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300'
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
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 md:px-3 md:py-2 md:text-sm dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              Next
            </button>
          ) : (
            <Link
              href={getPageUrl(currentPage + 1)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 transition hover:border-sky-200 hover:text-sky-700 md:px-3 md:py-2 md:text-sm dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
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
