/**
 * FILE: src/hooks/useAuditLogs.ts
 */

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { auditService } from '@/services/audit.service';
import { AuditLogFilters } from '@/types';

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AUDIT_LOGS, filters],
    queryFn: () => auditService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}
