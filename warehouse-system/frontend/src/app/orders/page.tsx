/**
 * FILE: src/app/orders/page.tsx
 * PURPOSE: Orders management page.
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OrderStatusBadge } from '@/components/ui/Badge';
import {
  Table, TableBody, TableCell, TableEmpty,
  TableHead, TableHeader, TableRow, TableSkeleton, Pagination,
} from '@/components/ui/Table';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OrderFilters } from '@/types';

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Fulfilled', value: 'fulfilled' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFilters>({ page: 1, limit: DEFAULT_PAGE_SIZE });
  const { data, isLoading } = useOrders(filters);

  return (
    <DashboardLayout title="Orders">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between" data-testid="orders-toolbar">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1" data-testid="order-status-filter">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters((p) => ({ ...p, status: opt.value as OrderFilters['status'], page: 1 }))}
              data-testid={`filter-order-${opt.value || 'all'}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                (filters.status ?? '') === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button data-testid="btn-create-order">
          <Plus className="h-4 w-4" />
          Create Order
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table data-testid="table-order-list">
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          {isLoading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : !data?.data?.length ? (
            <TableEmpty message="No orders found." cols={7} />
          ) : (
            <TableBody>
              {data.data.map((order) => (
                <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                  <TableCell>
                    <span className="font-mono text-sm font-medium text-blue-600">
                      {order.orderNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      order.type === 'sales'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {order.type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    {order.partnerName}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`btn-view-order-${order.id}`}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={(page) => setFilters((p) => ({ ...p, page }))}
          />
        )}
      </Card>
    </DashboardLayout>
  );
}
