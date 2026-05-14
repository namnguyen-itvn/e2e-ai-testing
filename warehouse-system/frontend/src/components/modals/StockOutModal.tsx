/**
 * FILE: src/components/modals/StockOutModal.tsx
 * PURPOSE: Modal xuất kho.
 */

'use client';

import { useState } from 'react';
import { useStockOut } from '@/hooks/useInventory';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/Modal';

interface StockOutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockOutModal({ open, onOpenChange }: StockOutModalProps) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const { mutate: stockOut, isPending } = useStockOut();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    stockOut(
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
      <DialogContent data-testid="modal-stock-out">
        <DialogHeader>
          <DialogTitle>Stock Out</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 p-6">
            <Input
              label="Product ID"
              required
              placeholder="Enter product ID or SKU"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              data-testid="input-stock-out-product-id"
            />
            <Input
              label="Quantity"
              type="number"
              required
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              data-testid="input-stock-out-quantity"
            />
            <Input
              label="Reference (e.g. SO-001)"
              placeholder="Optional"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              data-testid="input-stock-out-reference"
            />
            <Input
              label="Note"
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-stock-out-note"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" data-testid="btn-cancel-stock-out">Cancel</Button>
            </DialogClose>
            <Button type="submit" isLoading={isPending} data-testid="btn-submit-stock-out">
              Confirm Stock Out
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
