/**
 * FILE: src/hooks/useInventory.ts
 * PURPOSE: Custom hooks cho Inventory data & mutations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QUERY_KEYS } from '@/constants';
import { inventoryService } from '@/services/inventory.service';
import { AdjustStockPayload, StockInPayload, StockOutPayload } from '@/types';

export function useInventoryStocks(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY, params],
    queryFn: () => inventoryService.getStocks(params),
  });
}

export function useStockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StockInPayload) => inventoryService.stockIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY] });
      toast.success('Stock in recorded successfully');
    },
    onError: () => toast.error('Failed to record stock in'),
  });
}

export function useStockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StockOutPayload) => inventoryService.stockOut(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY] });
      toast.success('Stock out recorded successfully');
    },
    onError: () => toast.error('Failed to record stock out'),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdjustStockPayload) => inventoryService.adjustStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY] });
      toast.success('Stock adjusted successfully');
    },
    onError: () => toast.error('Failed to adjust stock'),
  });
}
