import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  total,
  limit,
  offset,
  onPageChange,
  className = ''
}) => {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = offset + limit < total;
  const hasPreviousPage = offset > 0;

  // Calculate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePageChange = (newOffset: number) => {
    if (newOffset >= 0 && newOffset < total) {
      onPageChange(newOffset);
    }
  };

  const goToFirstPage = () => handlePageChange(0);
  const goToPreviousPage = () => handlePageChange(Math.max(0, offset - limit));
  const goToNextPage = () => handlePageChange(offset + limit);
  const goToLastPage = () => handlePageChange((totalPages - 1) * limit);
  const goToPage = (page: number) => handlePageChange((page - 1) * limit);

  if (totalPages <= 1) {
    return null; // Don't show pagination if there's only one page or no items
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 ${className}`}>
      <div className="flex flex-1 justify-between sm:hidden">
        {/* Mobile pagination */}
        <button
          onClick={goToPreviousPage}
          disabled={!hasPreviousPage}
          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
            hasPreviousPage
              ? 'bg-white text-gray-700 hover:bg-gray-50'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Previous
        </button>
        <div className="flex items-center text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </div>
        <button
          onClick={goToNextPage}
          disabled={!hasNextPage}
          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
            hasNextPage
              ? 'bg-white text-gray-700 hover:bg-gray-50'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{offset + 1}</span> to{' '}
            <span className="font-medium">{Math.min(offset + limit, total)}</span> of{' '}
            <span className="font-medium">{total}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {/* First page button */}
            <button
              onClick={goToFirstPage}
              disabled={!hasPreviousPage}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                hasPreviousPage
                  ? 'text-gray-500 hover:bg-gray-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="First page"
            >
              <span className="sr-only">First page</span>
              <ChevronsLeft className="h-5 w-5" />
            </button>

            {/* Previous button */}
            <button
              onClick={goToPreviousPage}
              disabled={!hasPreviousPage}
              className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                hasPreviousPage
                  ? 'text-gray-500 hover:bg-gray-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Previous page"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Page numbers */}
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isCurrentPage = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    isCurrentPage
                      ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                  aria-current={isCurrentPage ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next button */}
            <button
              onClick={goToNextPage}
              disabled={!hasNextPage}
              className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                hasNextPage
                  ? 'text-gray-500 hover:bg-gray-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Next page"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Last page button */}
            <button
              onClick={goToLastPage}
              disabled={!hasNextPage}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                hasNextPage
                  ? 'text-gray-500 hover:bg-gray-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Last page"
            >
              <span className="sr-only">Last page</span>
              <ChevronsRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;

