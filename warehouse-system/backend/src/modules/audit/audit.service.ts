/**
 * FILE: src/modules/audit/audit.service.ts
 * PURPOSE: Write and query audit log records.
 *
 * DESIGN: AuditService is a PASSIVE service — it never throws errors
 * that would interrupt the main business flow. If audit logging fails,
 * we log the error but do NOT fail the original request.
 *
 * WHY? Audit logging is a cross-cutting concern. A failed audit write
 * should NOT cause a stock update or order creation to roll back.
 * The primary operation must always succeed independently.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  action: AuditAction;
  entityName: string;
  entityId?: string | null;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  performedBy?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Write a new audit log entry.
   * This method is fire-and-forget safe — errors are caught and logged,
   * never propagated to the caller.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const entry = this.auditLogRepository.create(dto);
      await this.auditLogRepository.save(entry);
    } catch (error) {
      // Log error but NEVER throw — audit must not break business logic
      this.logger.error(`Failed to write audit log: ${error}`, { dto });
    }
  }

  /**
   * GET audit logs with filters — for admin dashboard and compliance reports.
   */
  async findAll(options: {
    entityName?: string;
    entityId?: string;
    action?: AuditAction;
    performedBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditLog[]; total: number }> {
    const { page = 1, limit = 50, ...filters } = options;

    const qb = this.auditLogRepository
      .createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.entityName) {
      qb.andWhere('log.entity_name = :entityName', { entityName: filters.entityName });
    }
    if (filters.entityId) {
      qb.andWhere('log.entity_id = :entityId', { entityId: filters.entityId });
    }
    if (filters.action) {
      qb.andWhere('log.action = :action', { action: filters.action });
    }
    if (filters.performedBy) {
      qb.andWhere('log.performed_by = :performedBy', { performedBy: filters.performedBy });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * GET full history of a specific entity record.
   * e.g., "Show me everything that happened to Product ID abc-123"
   */
  async getEntityHistory(
    entityName: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityName, entityId },
      order: { createdAt: 'ASC' },
    });
  }
}
