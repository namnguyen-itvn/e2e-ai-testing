/**
 * FILE: src/types/index.ts
 * PURPOSE: Định nghĩa tất cả TypeScript interfaces/types cho toàn ứng dụng.
 *
 * GIẢI THÍCH:
 * - Dùng interface cho object shapes (data models).
 * - Dùng type cho union types, utility types.
 * - Tránh dùng `any` — luôn type rõ ràng.
 * - Export tất cả từ 1 file để import gọn hơn.
 */

// ── COMMON ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// ── AUTH ────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// ── PRODUCT ─────────────────────────────────────────────────────

export type ProductStatus = 'active' | 'inactive' | 'discontinued';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  status: ProductStatus;
  supplierId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  supplierId?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  status?: ProductStatus;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

// ── INVENTORY ───────────────────────────────────────────────────

export type TransactionType = 'in' | 'out' | 'adjust';

export interface InventoryStock {
  id: string;
  productId: string;
  product: Product;
  currentQuantity: number;
  minQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  product: Product;
  transactionType: TransactionType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reference?: string;
  note?: string;
  createdAt: string;
}

export interface StockInPayload {
  productId: string;
  quantity: number;
  reference?: string;
  note?: string;
}

export interface StockOutPayload {
  productId: string;
  quantity: number;
  reference?: string;
  note?: string;
}

export interface AdjustStockPayload {
  productId: string;
  newQuantity: number;
  note?: string;
}

// ── ORDER ───────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';
export type OrderType = 'sales' | 'purchase';

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  partnerName: string;
  totalAmount: number;
  items: OrderItem[];
  note?: string;
  createdAt: string;
  confirmedAt?: string;
  fulfilledAt?: string;
  cancelledAt?: string;
}

export interface CreateOrderPayload {
  type: OrderType;
  partnerName: string;
  note?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface OrderFilters {
  search?: string;
  type?: OrderType;
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

// ── AUDIT LOG ───────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  performedBy: string;
  user?: User;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ── DASHBOARD ───────────────────────────────────────────────────

export interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  ordersToday: number;
  totalWarehouses: number;
}
