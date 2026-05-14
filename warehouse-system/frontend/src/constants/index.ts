/**
 * FILE: src/constants/index.ts
 * PURPOSE: Tập trung tất cả hằng số của ứng dụng.
 *
 * BEST PRACTICE:
 * - Không hard-code string rải rác trong code.
 * - Thay đổi 1 chỗ, áp dụng toàn app.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const ROUTES = {
  DASHBOARD: '/',
  PRODUCTS: '/products',
  INVENTORY: '/inventory',
  ORDERS: '/orders',
  SUPPLIERS: '/suppliers',
  AUDIT_LOGS: '/audit-logs',
  USERS: '/users',
  SETTINGS: '/settings',
} as const;

export const QUERY_KEYS = {
  PRODUCTS: 'products',
  PRODUCT_DETAIL: 'product-detail',
  INVENTORY: 'inventory',
  ORDERS: 'orders',
  ORDER_DETAIL: 'order-detail',
  AUDIT_LOGS: 'audit-logs',
  USERS: 'users',
  DASHBOARD_STATS: 'dashboard-stats',
} as const;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;

export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DISCONTINUED: 'discontinued',
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_TYPE = {
  SALES: 'sales',
  PURCHASE: 'purchase',
} as const;

export const INVENTORY_TRANSACTION_TYPE = {
  IN: 'in',
  OUT: 'out',
  ADJUST: 'adjust',
} as const;

export const USER_ROLE = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const;
