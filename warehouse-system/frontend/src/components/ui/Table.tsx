/**
 * FILE: src/components/ui/Table.tsx
 * PURPOSE: Reusable table components với loading skeleton và empty state.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ── TABLE PRIMITIVES ────────────────────────────────────────────

function Table({
  className,
  'data-testid': testId,
  ...props
}: React.HTMLAttributes<HTMLTableElement> & { 'data-testid'?: string }) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        data-testid={testId}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-gray-200 bg-gray-50', className)} {...props} />;
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-gray-100', className)} {...props} />;
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors hover:bg-gray-50/50', className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-semibold text-gray-500 uppercase tracking-wide',
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3 align-middle text-gray-700', className)}
      {...props}
    />
  );
}

// ── SKELETON LOADING ────────────────────────────────────────────

function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <tbody className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-200 animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ── EMPTY STATE ─────────────────────────────────────────────────

function TableEmpty({
  message = 'No data found',
  cols = 6,
}: {
  message?: string;
  cols?: number;
}) {
  return (
    <tbody>
      <tr>
        <td
          colSpan={cols}
          className="px-4 py-12 text-center text-sm text-gray-500"
          data-testid="table-empty-state"
        >
          {message}
        </td>
      </tr>
    </tbody>
  );
}

// ── PAGINATION ──────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-t border-gray-200"
      data-testid="table-pagination"
    >
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{from}</span> to{' '}
        <span className="font-medium">{to}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          data-testid="btn-prev-page"
          className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <span className="px-3 py-1.5 text-sm text-gray-700">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          data-testid="btn-next-page"
          className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableSkeleton,
  TableEmpty,
  Pagination,
};
