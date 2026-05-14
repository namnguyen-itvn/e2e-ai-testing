/**
 * FILE: src/modules/products/entities/product.entity.ts
 * PURPOSE: Defines the Product database table via TypeORM decorators.
 *
 * CONCEPT — ENTITY:
 * ─────────────────────────────────────────────────────────────
 * An Entity is a TypeScript class that maps to a PostgreSQL table.
 * Each property with @Column() becomes a column in the table.
 * TypeORM reads these decorators and auto-generates the SQL schema.
 *
 * When DB_SYNCHRONIZE=true, TypeORM will automatically CREATE
 * this table in warehouse_db when the app starts.
 * ─────────────────────────────────────────────────────────────
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/**
 * Product Status Enum
 * Using an enum prevents invalid values from being stored in the DB.
 * This is much safer than using raw strings like 'active' or 'ACTIVE'.
 */
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

/**
 * @Entity('products') → maps this class to a table named "products" in PostgreSQL.
 * Always explicitly name your table — don't rely on class name auto-detection.
 */
@Entity('products')
export class Product {
  /**
   * Primary Key — auto-generated UUID.
   *
   * WHY UUID instead of auto-increment integer?
   * 1. UUIDs are globally unique — safe for distributed systems
   * 2. No sequential ID exposure (security: users can't guess IDs)
   * 3. Better for AI test data generation and data seeding
   * 4. Industry standard for enterprise APIs
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * @Index() → creates a DB index on this column.
   * Indexes speed up searches dramatically on large datasets.
   * SKU is frequently searched, so indexing it is important.
   *
   * unique: true → no two products can have the same SKU.
   */
  @Index()
  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string; // Stock Keeping Unit — unique product identifier

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  /**
   * Price stored as DECIMAL for precision.
   * NEVER use float/double for money — floating point math causes rounding errors!
   * precision: 10 = total digits, scale: 2 = decimal places (e.g., 99999999.99)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 0 })
  quantity: number; // Current stock quantity

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null; // e.g., 'pcs', 'kg', 'box', 'liter'

  /**
   * Enum column — only allows values defined in ProductStatus enum.
   * PostgreSQL enforces this at the DB level — invalid values are rejected.
   */
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  /**
   * Soft Delete — DeleteDateColumn
   * ─────────────────────────────────────────────────────────────
   * Instead of permanently deleting rows (hard delete), we set
   * a deletedAt timestamp. The row stays in the DB but is hidden.
   *
   * WHY SOFT DELETE?
   * 1. Audit trail — you can see what was deleted and when
   * 2. Recovery — accidentally deleted data can be restored
   * 3. Required for compliance (GDPR, SOX, etc.)
   * 4. Essential for AI test data and QA history tracking
   *
   * TypeORM automatically excludes soft-deleted rows from all queries.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  /**
   * Audit Timestamps — automatically managed by TypeORM.
   * createdAt: set once when the row is first inserted
   * updatedAt: updated automatically every time the row changes
   *
   * These are CRITICAL for:
   * - Audit logs and compliance
   * - API testing (verify timestamps are set correctly)
   * - Performance testing (measure data freshness)
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
