/**
 * FILE: src/services/inventory.service.ts
 * PURPOSE: API calls cho Inventory management.
 */

import axiosInstance from '@/lib/axios';
import {
  AdjustStockPayload,
  InventoryStock,
  InventoryTransaction,
  PaginatedResponse,
  StockInPayload,
  StockOutPayload,
} from '@/types';

export const inventoryService = {
  getStocks: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<InventoryStock>> => {
    const { data } = await axiosInstance.get('/inventory/stocks', { params });
    return data;
  },

  stockIn: async (payload: StockInPayload): Promise<InventoryTransaction> => {
    const { data } = await axiosInstance.post('/inventory/stock-in', payload);
    return data;
  },

  stockOut: async (payload: StockOutPayload): Promise<InventoryTransaction> => {
    const { data } = await axiosInstance.post('/inventory/stock-out', payload);
    return data;
  },

  adjustStock: async (payload: AdjustStockPayload): Promise<InventoryTransaction> => {
    const { data } = await axiosInstance.post('/inventory/adjust', payload);
    return data;
  },

  getTransactions: async (params?: {
    productId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<InventoryTransaction>> => {
    const { data } = await axiosInstance.get('/inventory/transactions', { params });
    return data;
  },
};
