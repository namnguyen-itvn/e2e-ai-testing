/**
 * FILE: src/modules/audit/entities/audit-log.entity.ts
 * PURPOSE: Immutable record of every data-mutating action in the system.
 *
 * DESIGN PRINCIPLES:
 * ─────────────────────────────────────────────────────────────
 * 1. IMMUTABLE   → Audit logs are NEVER updated or deleted.
 *                  If someone deletes audit logs = security breach.
 * 2. COMPLETE    → Stores BEFORE and AFTER state (JSON snapshots).
 * 3. CONTEXTUAL  → Stores WHO, WHAT, WHEN, WHERE (IP, user agent).
 * 4. STRUCTURED  → JSON format makes it queryable & AI-parseable.
 *
 * USE CASES:
 * - Compliance auditing (SOX, ISO 27001)
 * - Security investigation ("who changed this price?")
 * - QA verification ("did this API actually write correct data?")
 * - AI test data analysis ("what mutations happened during test run?")
 * ─────────────────────────────────────────────────────────────
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN  = 'LOGIN',
  LOGOUT = 'LOGOUT',
  STOCK_IN  = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  STOCK_ADJUST = 'STOCK_ADJUST',
  ORDER_CREATE   = 'ORDER_CREATE',
  ORDER_CONFIRM  = 'ORDER_CONFIRM',
  ORDER_FULFILL  = 'ORDER_FULFILL',
  ORDER_CANCEL   = 'ORDER_CANCEL',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The action that was performed.
   * Using enum ensures consistent, queryable values.
   */
  @Index()
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  /**
   * Which domain entity was affected.
   * e.g., 'Product', 'Order', 'User', 'InventoryTransaction'
   */
  @Index()
  @Column({ name: 'entity_name', type: 'varchar', length: 100 })
  entityName: string;

  /**
   * The UUID of the affected record.
   * Allows querying: "show all audit logs for product X"
   */
  @Index()
  @Column({ name: 'entity_id', type: 'varchar', length: 255, nullable: true })
  entityId: string | null;

  /**
   * JSON snapshot of the entity state BEFORE the action.
   * null for CREATE actions (nothing existed before).
   */
  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, any> | null;

  /**
   * JSON snapshot of the entity state AFTER the action.
   * null for DELETE actions (nothing exists after).
   */
  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any> | null;

  /**
   * Who performed the action.
   * null = unauthenticated user (e.g., public registration)
   */
  @Index()
  @Column({ name: 'performed_by', type: 'varchar', length: 255, nullable: true })
  performedBy: string | null; // user email or ID

  /** IP address of the request origin — for security auditing */
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  /** HTTP User-Agent header — identifies client type */
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  /**
   * Additional context — flexible JSON for extra metadata.
   * e.g., { "reason": "manual stocktake", "orderId": "..." }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Audit logs are append-only — only createdAt, never updatedAt.
   * This enforces immutability at the schema level.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
