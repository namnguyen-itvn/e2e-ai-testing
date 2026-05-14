/**
 * FILE: src/components/ui/Badge.tsx
 * PURPOSE: Status badge dùng cho product status, order status, v.v.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-yellow-100 text-yellow-700',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
        purple: 'bg-purple-100 text-purple-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ── Convenience wrappers cho các status phổ biến ─────────────────

export function ProductStatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    active: 'success',
    inactive: 'warning',
    discontinued: 'danger',
  };
  return (
    <Badge variant={variantMap[status] ?? 'default'} data-testid={`badge-status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    pending: 'warning',
    confirmed: 'info',
    fulfilled: 'success',
    cancelled: 'danger',
  };
  return (
    <Badge variant={variantMap[status] ?? 'default'} data-testid={`badge-order-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function StockStatusBadge({
  current,
  min,
}: {
  current: number;
  min: number;
}) {
  if (current === 0)
    return <Badge variant="danger" data-testid="badge-out-of-stock">Out of Stock</Badge>;
  if (current <= min)
    return <Badge variant="warning" data-testid="badge-low-stock">Low Stock</Badge>;
  return <Badge variant="success" data-testid="badge-in-stock">In Stock</Badge>;
}

export { Badge, badgeVariants };
