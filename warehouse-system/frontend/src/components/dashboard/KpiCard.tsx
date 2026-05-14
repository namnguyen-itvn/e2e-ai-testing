/**
 * FILE: src/components/dashboard/KpiCard.tsx
 * PURPOSE: KPI metric card cho dashboard overview.
 */

import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  'data-testid'?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
  trend,
  'data-testid': testId,
}: KpiCardProps) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      data-testid={testId}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p
            className="mt-1 text-2xl font-bold text-gray-900"
            data-testid={testId ? `${testId}-value` : undefined}
          >
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={cn(
              'font-medium',
              trend.positive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-gray-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
