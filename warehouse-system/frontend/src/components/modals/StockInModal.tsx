/**
 * FILE: src/components/modals/StockInModal.tsx
 * PURPOSE: Modal nhập kho — chọn sản phẩm, nhập số lượng và reference.
 */

'use client';

import { useState } from 'react';
import { useStockIn } from '@/hooks/useInventory';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/Modal';

interface StockInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockInModal({ open, onOpenChange }: StockInModalProps) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const { mutate: stockIn, isPending } = useStockIn();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    stockIn(
      { productId, quantity, reference, note },
      {
        onSuccess: () => {
          setProductId(''); setQuantity(1); setReference(''); setNote('');
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="modal-stock-in">
        <DialogHeader>
          <DialogTitle>Stock In</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 p-6">
            <Input
              label="Product ID"
              required
              placeholder="Enter product ID or SKU"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              data-testid="input-stock-in-product-id"
            />
            <Input
              label="Quantity"
              type="number"
              required
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              data-testid="input-stock-in-quantity"
            />
            <Input
              label="Reference (e.g. PO-001)"
              placeholder="Optional"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              data-testid="input-stock-in-reference"
            />
            <Input
              label="Note"
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-stock-in-note"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" data-testid="btn-cancel-stock-in">Cancel</Button>
            </DialogClose>
            <Button type="submit" isLoading={isPending} data-testid="btn-submit-stock-in">
              Confirm Stock In
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
