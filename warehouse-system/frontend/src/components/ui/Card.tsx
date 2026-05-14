/**
 * FILE: src/components/ui/Card.tsx
 * PURPOSE: Card container component cho dashboard, forms.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: CardProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 p-5 border-b border-gray-100', className)} {...props} />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-gray-900', className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-gray-500', className)} {...props} />;
}

function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('p-5', className)} {...props} />;
}

function CardFooter({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('flex items-center px-5 py-4 border-t border-gray-100', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
