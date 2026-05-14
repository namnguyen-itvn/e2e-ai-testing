/**
 * FILE: src/hooks/useOrders.ts
 * PURPOSE: Custom hooks cho Orders data & mutations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QUERY_KEYS } from '@/constants';
import { ordersService } from '@/services/orders.service';
import { CreateOrderPayload, OrderFilters } from '@/types';

export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.ORDERS, filters],
    queryFn: () => ordersService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.ORDER_DETAIL, id],
    queryFn: () => ordersService.getById(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] });
      toast.success('Order created successfully');
    },
    onError: () => toast.error('Failed to create order'),
  });
}

export function useOrderAction() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] });

  const confirm = useMutation({
    mutationFn: ordersService.confirm,
    onSuccess: () => { invalidate(); toast.success('Order confirmed'); },
    onError: () => toast.error('Failed to confirm order'),
  });

  const fulfill = useMutation({
    mutationFn: ordersService.fulfill,
    onSuccess: () => { invalidate(); toast.success('Order fulfilled'); },
    onError: () => toast.error('Failed to fulfill order'),
  });

  const cancel = useMutation({
    mutationFn: ordersService.cancel,
    onSuccess: () => { invalidate(); toast.success('Order cancelled'); },
    onError: () => toast.error('Failed to cancel order'),
  });

  return { confirm, fulfill, cancel };
}
