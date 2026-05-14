/**
 * FILE: src/components/modals/EditProductModal.tsx
 * PURPOSE: Modal form chỉnh sửa sản phẩm (pre-filled với data hiện tại).
 */

'use client';

import { useEffect, useState } from 'react';
import { useUpdateProduct } from '@/hooks/useProducts';
import { Product, UpdateProductPayload } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Modal';

const CATEGORY_OPTIONS = [
  { label: 'Electronics', value: 'Electronics' },
  { label: 'Clothing', value: 'Clothing' },
  { label: 'Food & Beverage', value: 'Food & Beverage' },
  { label: 'Furniture', value: 'Furniture' },
  { label: 'Tools', value: 'Tools' },
  { label: 'Other', value: 'Other' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Discontinued', value: 'discontinued' },
];

interface EditProductModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductModal({ product, open, onOpenChange }: EditProductModalProps) {
  const [form, setForm] = useState<UpdateProductPayload>({});
  const { mutate: updateProduct, isPending } = useUpdateProduct();

  // Pre-fill form với data hiện tại của product
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        unit: product.unit,
        status: product.status,
      });
    }
  }, [product]);

  function handleChange(field: keyof UpdateProductPayload, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateProduct(
      { id: product.id, payload: form },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="modal-edit-product">
        <DialogHeader>
          <DialogTitle>Edit Product — {product.sku}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} data-testid="form-edit-product">
          <div className="grid grid-cols-2 gap-4 p-6">
            <div className="col-span-2">
              <Input
                label="Product Name"
                required
                value={form.name ?? ''}
                onChange={(e) => handleChange('name', e.target.value)}
                data-testid="input-edit-product-name"
              />
            </div>
            <div>
              <Select
                label="Category"
                options={CATEGORY_OPTIONS}
                value={form.category ?? ''}
                onChange={(e) => handleChange('category', e.target.value)}
                data-testid="select-edit-category"
              />
            </div>
            <div>
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={form.status ?? ''}
                onChange={(e) => handleChange('status', e.target.value as Product['status'])}
                data-testid="select-edit-status"
              />
            </div>
            <div>
              <Input
                label="Price (USD)"
                type="number"
                min={0}
                step={0.01}
                value={form.price ?? 0}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                data-testid="input-edit-price"
              />
            </div>
            <div>
              <Input
                label="Unit"
                value={form.unit ?? ''}
                onChange={(e) => handleChange('unit', e.target.value)}
                data-testid="input-edit-unit"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="mt-1.5 flex min-h-[72px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.description ?? ''}
                onChange={(e) => handleChange('description', e.target.value)}
                data-testid="input-edit-description"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" data-testid="btn-cancel-edit-product">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" isLoading={isPending} data-testid="btn-submit-edit-product">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
