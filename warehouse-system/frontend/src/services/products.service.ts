/**
 * FILE: src/services/products.service.ts
 * PURPOSE: Tất cả API calls liên quan đến Products.
 *
 * GIẢI THÍCH:
 * - Service layer tách biệt logic gọi API ra khỏi component.
 * - Component chỉ cần gọi hàm, không cần biết URL hay HTTP method.
 * - Dễ mock khi viết unit test.
 */

import axiosInstance from '@/lib/axios';
import {
  CreateProductPayload,
  PaginatedResponse,
  Product,
  ProductFilters,
  UpdateProductPayload,
} from '@/types';

export const productsService = {
  /**
   * Lấy danh sách sản phẩm với phân trang và filter
   */
  getAll: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.status) params.set('status', filters.status);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    const { data } = await axiosInstance.get<PaginatedResponse<Product>>(
      `/products?${params.toString()}`
    );
    return data;
  },

  /**
   * Lấy chi tiết 1 sản phẩm theo ID
   */
  getById: async (id: string): Promise<Product> => {
    const { data } = await axiosInstance.get<Product>(`/products/${id}`);
    return data;
  },

  /**
   * Tạo sản phẩm mới
   */
  create: async (payload: CreateProductPayload): Promise<Product> => {
    const { data } = await axiosInstance.post<Product>('/products', payload);
    return data;
  },

  /**
   * Cập nhật sản phẩm (partial update)
   */
  update: async (id: string, payload: UpdateProductPayload): Promise<Product> => {
    const { data } = await axiosInstance.patch<Product>(`/products/${id}`, payload);
    return data;
  },

  /**
   * Soft delete sản phẩm
   */
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/products/${id}`);
  },
};
