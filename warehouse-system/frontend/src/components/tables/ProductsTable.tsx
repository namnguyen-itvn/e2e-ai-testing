/**
 * FILE: src/components/tables/ProductsTable.tsx
 * PURPOSE: Products table với sorting, actions, status badges.
 */

'use client';

import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDeleteProduct } from '@/hooks/useProducts';
import { Button } from '@/components/ui/Button';
import { ProductStatusBadge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/components/ui/Table';

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
}

export function ProductsTable({ products, isLoading, onEdit }: ProductsTableProps) {
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(product: Product) {
    if (!confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    setDeletingId(product.id);
    deleteProduct(product.id, {
      onSettled: () => setDeletingId(null),
    });
  }

  return (
    <Table data-testid="table-product-list">
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      {isLoading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : products.length === 0 ? (
        <TableEmpty message="No products found. Create your first product." cols={8} />
      ) : (
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
              <TableCell>
                <span className="font-mono text-xs text-gray-600">{product.sku}</span>
              </TableCell>
              <TableCell>
                <span className="font-medium text-gray-900">{product.name}</span>
                {product.description && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                    {product.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <span className="text-gray-600">{product.category}</span>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(product.price)}
              </TableCell>
              <TableCell className="text-right">
                <span className={product.quantity === 0 ? 'text-red-600 font-medium' : ''}>
                  {product.quantity} {product.unit}
                </span>
              </TableCell>
              <TableCell>
                <ProductStatusBadge status={product.status} />
              </TableCell>
              <TableCell className="text-gray-500 text-xs">
                {formatDate(product.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(product)}
                    data-testid={`btn-edit-product-${product.id}`}
                    title="Edit product"
                  >
                    <Edit className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(product)}
                    isLoading={isDeleting && deletingId === product.id}
                    data-testid={`btn-delete-product-${product.id}`}
                    title="Delete product"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      )}
    </Table>
  );
}
