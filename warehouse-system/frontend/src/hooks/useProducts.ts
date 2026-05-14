/**
 * FILE: src/hooks/useProducts.ts
 * PURPOSE: Custom hooks cho Products data fetching với React Query.
 *
 * GIẢI THÍCH VỀ REACT QUERY:
 * - React Query quản lý SERVER STATE (data từ API).
 * - Tự động cache, refetch, deduplication requests.
 * - useQuery: fetch data (GET).
 * - useMutation: thay đổi data (POST/PATCH/DELETE).
 *
 * TẠI SAO DÙNG REACT QUERY THAY VÌ useEffect + useState?
 * - Không cần viết loading/error state thủ công.
 * - Tự động invalidate cache sau khi mutation thành công.
 * - Built-in retry logic khi request fail.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QUERY_KEYS } from '@/constants';
import { productsService } from '@/services/products.service';
import { CreateProductPayload, ProductFilters, UpdateProductPayload } from '@/types';

/**
 * Hook lấy danh sách sản phẩm với phân trang & filter
 */
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, filters],
    queryFn: () => productsService.getAll(filters),
    placeholderData: (prev) => prev, // Giữ data cũ khi đang fetch trang mới
  });
}

/**
 * Hook lấy chi tiết 1 sản phẩm
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCT_DETAIL, id],
    queryFn: () => productsService.getById(id),
    enabled: !!id, // Chỉ fetch khi có id
  });
}

/**
 * Hook tạo sản phẩm mới
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productsService.create(payload),
    onSuccess: () => {
      // Invalidate cache → React Query sẽ tự refetch danh sách
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      toast.success('Product created successfully');
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to create product';
      toast.error(typeof message === 'string' ? message : message[0]);
    },
  });
}

/**
 * Hook cập nhật sản phẩm
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      productsService.update(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCT_DETAIL, data.id] });
      toast.success('Product updated successfully');
    },
    onError: () => {
      toast.error('Failed to update product');
    },
  });
}

/**
 * Hook xóa sản phẩm (soft delete)
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      toast.success('Product deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete product');
    },
  });
}
