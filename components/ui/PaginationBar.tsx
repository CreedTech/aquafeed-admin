import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'items',
  className = '',
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 ${className}`}
    >
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{start}</span>-
        <span className="font-semibold text-gray-900">{end}</span> of{' '}
        <span className="font-semibold text-gray-900">{totalItems}</span>{' '}
        {itemLabel}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}/page
            </option>
          ))}
        </select>

        <button
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="First page"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canPrev}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="px-2 text-sm text-gray-700 min-w-[72px] text-center">
          {safePage} / {Math.max(1, totalPages)}
        </span>

        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canNext}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
