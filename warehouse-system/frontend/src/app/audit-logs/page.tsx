/**
 * FILE: src/app/audit-logs/page.tsx
 * PURPOSE: Audit Logs page — rất quan trọng cho AI analysis & automation validation.
 *
 * GIẢI THÍCH:
 * - Hiển thị mọi thay đổi trong hệ thống (ai làm gì, lúc nào, thay đổi gì).
 * - Filter theo user, action, entity, date range.
 * - data-testid đầy đủ cho Playwright scraping audit data.
 */

'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import {
  Table, TableBody, TableCell, TableEmpty,
  TableHead, TableHeader, TableRow, TableSkeleton, Pagination,
} from '@/components/ui/Table';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { formatDate } from '@/lib/utils';
import { AuditLogFilters } from '@/types';

const ACTION_OPTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'CREATE', value: 'CREATE' },
  { label: 'UPDATE', value: 'UPDATE' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'LOGIN', value: 'LOGIN' },
];

const ENTITY_OPTIONS = [
  { label: 'All Entities', value: '' },
  { label: 'products', value: 'products' },
  { label: 'orders', value: 'orders' },
  { label: 'inventory_stocks', value: 'inventory_stocks' },
  { label: 'users', value: 'users' },
];

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });
  const [localFilters, setLocalFilters] = useState({ action: '', entityName: '' });

  const { data, isLoading } = useAuditLogs(filters);

  function applyFilters() {
    setFilters((prev) => ({
      ...prev,
      action: localFilters.action || undefined,
      entityName: localFilters.entityName || undefined,
      page: 1,
    }));
  }

  return (
    <DashboardLayout title="Audit Logs">
      {/* Filters */}
      <Card className="mb-4 p-4">
        <div
          className="flex flex-wrap items-end gap-3"
          data-testid="audit-log-filters"
        >
          <Select
            label="Action"
            options={ACTION_OPTIONS}
            value={localFilters.action}
            onChange={(e) =>
              setLocalFilters((p) => ({ ...p, action: e.target.value }))
            }
            data-testid="select-filter-action"
            className="w-40"
          />
          <Select
            label="Entity"
            options={ENTITY_OPTIONS}
            value={localFilters.entityName}
            onChange={(e) =>
              setLocalFilters((p) => ({ ...p, entityName: e.target.value }))
            }
            data-testid="select-filter-entity"
            className="w-44"
          />
          <Input
            label="Date From"
            type="date"
            onChange={(e) =>
              setFilters((p) => ({ ...p, dateFrom: e.target.value }))
            }
            data-testid="input-filter-date-from"
            className="w-40"
          />
          <Input
            label="Date To"
            type="date"
            onChange={(e) =>
              setFilters((p) => ({ ...p, dateTo: e.target.value }))
            }
            data-testid="input-filter-date-to"
            className="w-40"
          />
          <div className="flex items-end">
            <Button
              onClick={applyFilters}
              variant="outline"
              data-testid="btn-apply-audit-filters"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table data-testid="table-audit-log-list">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Before</TableHead>
              <TableHead>After</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>

          {isLoading ? (
            <TableSkeleton rows={10} cols={7} />
          ) : !data?.data?.length ? (
            <TableEmpty message="No audit logs found." cols={7} />
          ) : (
            <TableBody>
              {data.data.map((log) => (
                <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                  <TableCell>
                    <span className="text-sm font-medium text-gray-900">
                      {log.user?.email ?? log.performedBy}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      log.action === 'CREATE' ? 'bg-green-100 text-green-700'
                      : log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700'
                      : log.action === 'DELETE' ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                    }`} data-testid={`badge-action-${log.action}`}>
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">{log.entityName}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-gray-400">
                      {log.entityId.slice(0, 8)}...
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.oldValue ? (
                      <pre className="max-w-[160px] overflow-hidden rounded bg-gray-50 p-1 text-xs text-gray-500">
                        {JSON.stringify(log.oldValue, null, 2).slice(0, 60)}...
                      </pre>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.newValue ? (
                      <pre className="max-w-[160px] overflow-hidden rounded bg-gray-50 p-1 text-xs text-gray-500">
                        {JSON.stringify(log.newValue, null, 2).slice(0, 60)}...
                      </pre>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={(page) => setFilters((p) => ({ ...p, page }))}
          />
        )}
      </Card>
    </DashboardLayout>
  );
}
