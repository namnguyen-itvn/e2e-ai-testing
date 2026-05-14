/**
 * FILE: src/components/modals/CreateProductModal.tsx
 * PURPOSE: Modal form tạo sản phẩm mới với validation.
 *
 * GIẢI THÍCH:
 * - Dùng React controlled form (useState cho mỗi field).
 * - Validation đơn giản phía client trước khi submit.
 * - data-testid trên tất cả input/button cho Playwright.
 * - Khi submit thành công → đóng modal, reset form.
 */

'use client';

import { useState } from 'react';
import { useCreateProduct } from '@/hooks/useProducts';
import { CreateProductPayload } from '@/types';
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

const INITIAL_FORM: CreateProductPayload = {
  sku: '',
  name: '',
  description: '',
  category: '',
  price: 0,
  quantity: 0,
  unit: 'pcs',
};

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductModal({ open, onOpenChange }: CreateProductModalProps) {
  const [form, setForm] = useState<CreateProductPayload>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateProductPayload, string>>>({});

  const { mutate: createProduct, isPending } = useCreateProduct();

  function handleChange(field: keyof CreateProductPayload, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error khi user bắt đầu sửa
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!form.sku.trim()) newErrors.sku = 'SKU is required';
    if (!form.name.trim()) newErrors.name = 'Product name is required';
    if (!form.category) newErrors.category = 'Category is required';
    if (form.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (form.quantity < 0) newErrors.quantity = 'Quantity cannot be negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createProduct(form, {
      onSuccess: () => {
        setForm(INITIAL_FORM);
        setErrors({});
        onOpenChange(false);
      },
    });
  }

  function handleClose() {
    setForm(INITIAL_FORM);
    setErrors({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-testid="modal-create-product">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} data-testid="form-create-product">
          <div className="grid grid-cols-2 gap-4 p-6">
            {/* SKU */}
            <div className="col-span-1">
              <Input
                label="SKU"
                required
                placeholder="e.g. WH-PROD-001"
                value={form.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                error={errors.sku}
                data-testid="input-product-sku"
              />
            </div>

            {/* Product Name */}
            <div className="col-span-1">
              <Input
                label="Product Name"
                required
                placeholder="e.g. Office Chair"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
                data-testid="input-product-name"
              />
            </div>

            {/* Category */}
            <div className="col-span-1">
              <Select
                label="Category"
                required
                options={CATEGORY_OPTIONS}
                placeholder="Select category"
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                error={errors.category}
                data-testid="select-product-category"
              />
            </div>

            {/* Unit */}
            <div className="col-span-1">
              <Input
                label="Unit"
                placeholder="e.g. pcs, kg, box"
                value={form.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                data-testid="input-product-unit"
              />
            </div>

            {/* Price */}
            <div className="col-span-1">
              <Input
                label="Price (USD)"
                type="number"
                required
                min={0}
                step={0.01}
                placeholder="0.00"
                value={form.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                error={errors.price}
                data-testid="input-product-price"
              />
            </div>

            {/* Quantity */}
            <div className="col-span-1">
              <Input
                label="Initial Quantity"
                type="number"
                min={0}
                placeholder="0"
                value={form.quantity}
                onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                error={errors.quantity}
                data-testid="input-product-quantity"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="mt-1.5 flex min-h-[72px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                placeholder="Optional product description..."
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                data-testid="input-product-description"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                data-testid="btn-cancel-create-product"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              isLoading={isPending}
              data-testid="btn-submit-create-product"
            >
              Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
