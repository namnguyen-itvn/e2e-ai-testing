/**
 * FILE: src/app/inventory/page.tsx
 * PURPOSE: Inventory management page — xem tồn kho, nhập/xuất kho.
 */

'use client';

import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from 'lucide-react';
import { useInventoryStocks } from '@/hooks/useInventory';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StockStatusBadge } from '@/components/ui/Badge';
import {
  Table, TableBody, TableCell, TableEmpty,
  TableHead, TableHeader, TableRow, TableSkeleton, Pagination,
} from '@/components/ui/Table';
import { StockInModal } from '@/components/modals/StockInModal';
import { StockOutModal } from '@/components/modals/StockOutModal';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { formatDate } from '@/lib/utils';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);

  const { data, isLoading } = useInventoryStocks({ page, limit: DEFAULT_PAGE_SIZE });

  return (
    <DashboardLayout title="Inventory">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between" data-testid="inventory-toolbar">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SlidersHorizontal className="h-4 w-4" />
          <span>
            {data?.total ?? 0} products tracked
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsStockOutOpen(true)}
            data-testid="btn-stock-out"
          >
            <ArrowUpCircle className="h-4 w-4 text-red-500" />
            Stock Out
          </Button>
          <Button
            onClick={() => setIsStockInOpen(true)}
            data-testid="btn-stock-in"
          >
            <ArrowDownCircle className="h-4 w-4" />
            Stock In
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="overflow-hidden">
        <Table data-testid="table-inventory-list">
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Available Qty</TableHead>
              <TableHead className="text-right">Min Qty</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>

          {isLoading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : !data?.data?.length ? (
            <TableEmpty message="No inventory data found." cols={7} />
          ) : (
            <TableBody>
              {data.data.map((stock) => (
                <TableRow key={stock.id} data-testid={`row-inventory-${stock.id}`}>
                  <TableCell>
                    <span className="font-mono text-xs text-gray-500">
                      {stock.product?.sku}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900">
                      {stock.product?.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {stock.product?.category}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {stock.currentQuantity}
                  </TableCell>
                  <TableCell className="text-right text-gray-500">
                    {stock.minQuantity}
                  </TableCell>
                  <TableCell>
                    <StockStatusBadge
                      current={stock.currentQuantity}
                      min={stock.minQuantity}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">
                    {formatDate(stock.updatedAt)}
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
            onPageChange={setPage}
          />
        )}
      </Card>

      {/* Modals */}
      <StockInModal open={isStockInOpen} onOpenChange={setIsStockInOpen} />
      <StockOutModal open={isStockOutOpen} onOpenChange={setIsStockOutOpen} />
    </DashboardLayout>
  );
}
