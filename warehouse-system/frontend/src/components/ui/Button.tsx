/**
 * FILE: src/components/ui/Button.tsx
 * PURPOSE: Reusable button với variants, sizes, loading state.
 *
 * GIẢI THÍCH:
 * - Dùng class-variance-authority (CVA) để quản lý variants.
 * - data-testid: bắt buộc cho Playwright automation.
 * - forwardRef: cho phép parent component ref đến DOM element.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles áp dụng cho tất cả variants
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
        destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
        outline:
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm',
        ghost: 'text-gray-700 hover:bg-gray-100',
        link: 'text-blue-600 underline-offset-4 hover:underline',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-9 px-4',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  'data-testid'?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
