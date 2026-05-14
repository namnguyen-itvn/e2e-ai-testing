/**
 * FILE: src/services/orders.service.ts
 * PURPOSE: API calls cho Orders management.
 */

import axiosInstance from '@/lib/axios';
import {
  CreateOrderPayload,
  Order,
  OrderFilters,
  PaginatedResponse,
} from '@/types';

export const ordersService = {
  getAll: async (filters: OrderFilters = {}): Promise<PaginatedResponse<Order>> => {
    const { data } = await axiosInstance.get('/orders', { params: filters });
    return data;
  },

  getById: async (id: string): Promise<Order> => {
    const { data } = await axiosInstance.get<Order>(`/orders/${id}`);
    return data;
  },

  create: async (payload: CreateOrderPayload): Promise<Order> => {
    const { data } = await axiosInstance.post<Order>('/orders', payload);
    return data;
  },

  confirm: async (id: string): Promise<Order> => {
    const { data } = await axiosInstance.patch<Order>(`/orders/${id}/confirm`);
    return data;
  },

  fulfill: async (id: string): Promise<Order> => {
    const { data } = await axiosInstance.patch<Order>(`/orders/${id}/fulfill`);
    return data;
  },

  cancel: async (id: string): Promise<Order> => {
    const { data } = await axiosInstance.patch<Order>(`/orders/${id}/cancel`);
    return data;
  },
};
