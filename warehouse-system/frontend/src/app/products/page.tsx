/**
 * FILE: src/app/products/page.tsx
 * PURPOSE: Products management page — CRUD đầy đủ.
 */

'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { Product, ProductFilters } from '@/types';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProductsTable } from '@/components/tables/ProductsTable';
import { CreateProductModal } from '@/components/modals/CreateProductModal';
import { EditProductModal } from '@/components/modals/EditProductModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Table';
import { DEFAULT_PAGE_SIZE } from '@/constants';

const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Discontinued', value: 'discontinued' },
];

export default function ProductsPage() {
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data, isLoading } = useProducts(filters);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }

  function handleStatusFilter(status: string) {
    setFilters((prev) => ({
      ...prev,
      status: status as ProductFilters['status'] | undefined,
      page: 1,
    }));
  }

  return (
    <DashboardLayout title="Products">
      {/* Toolbar */}
      <div
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid="products-toolbar"
      >
        {/* Search + Filter */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-72 rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-search-products"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" data-testid="btn-search-products">
              Search
            </Button>
          </form>

          <Select
            options={STATUS_OPTIONS}
            value={filters.status ?? ''}
            onChange={(e) => handleStatusFilter(e.target.value)}
            data-testid="select-filter-status"
            className="w-40"
          />
        </div>

        {/* Create Button */}
        <Button
          onClick={() => setIsCreateOpen(true)}
          data-testid="btn-create-product"
        >
          <Plus className="h-4 w-4" />
          Create Product
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <ProductsTable
          products={data?.data ?? []}
          isLoading={isLoading}
          onEdit={setEditingProduct}
        />
        {data && data.totalPages > 1 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          />
        )}
      </Card>

      {/* Modals */}
      <CreateProductModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open: boolean) => { if (!open) setEditingProduct(null); }}
        />
      )}
    </DashboardLayout>
  );
}
