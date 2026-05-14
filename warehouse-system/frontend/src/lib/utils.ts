/**
 * FILE: src/lib/utils.ts
 * PURPOSE: Utility functions dùng chung toàn app.
 *
 * GIẢI THÍCH:
 * - `cn()` là hàm merge class TailwindCSS an toàn.
 * - Kết hợp clsx (logic điều kiện) + tailwind-merge (loại bỏ class trùng).
 * - Dùng ở mọi component thay vì nối string thủ công.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format số thành tiền tệ VND hoặc USD
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format ngày giờ theo chuẩn đọc được
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

/**
 * Truncate chuỗi dài
 */
export function truncate(str: string, maxLength = 50): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}
