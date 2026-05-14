/**
 * FILE: src/services/audit.service.ts
 * PURPOSE: API calls cho Audit Logs.
 */

import axiosInstance from '@/lib/axios';
import { AuditLog, AuditLogFilters, PaginatedResponse } from '@/types';

export const auditService = {
  getAll: async (filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> => {
    const { data } = await axiosInstance.get('/audit-logs', { params: filters });
    return data;
  },
};
