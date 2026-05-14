/**
 * FILE: src/modules/inventory/entities/inventory-stock.entity.ts
 * PURPOSE: Maintains the CURRENT real-time stock level for each product.
 *
 * DESIGN PATTERN — CQRS-lite (Read/Write Separation):
 * ─────────────────────────────────────────────────────────────
 * - inventory_transactions = Write side (append-only log)
 * - inventory_stocks       = Read side (current state snapshot)
 *
 * When a transaction happens:
 *   1. INSERT a new InventoryTransaction row (the event)
 *   2. UPDATE InventoryStock.currentQuantity (the projection)
 *
 * This gives you BOTH fast reads (no need to SUM all transactions)
 * AND full history (every change is logged).
 *
 * WHY NOT JUST USE products.quantity?
 * - Products table should not be responsible for stock logic
 * - A product can have stock in MULTIPLE warehouses (future feature)
 * - Separation of concerns: product catalog ≠ inventory management
 * ─────────────────────────────────────────────────────────────
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('inventory_stocks')
export class InventoryStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * @OneToOne → Each product has exactly ONE stock record.
   * This enforces that we never have duplicate stock records per product.
   * unique: true on the column level adds a DB unique constraint.
   */
  @OneToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Index({ unique: true })
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'current_quantity', type: 'int', default: 0 })
  currentQuantity: number;

  /**
   * Low stock threshold — for alerts and automation.
   * When currentQuantity <= lowStockThreshold → trigger low stock warning.
   * Useful for: automated reorder, QA dashboard alerts, AI monitoring.
   */
  @Column({ name: 'low_stock_threshold', type: 'int', default: 10 })
  lowStockThreshold: number;

  /**
   * Computed property — is stock critically low?
   * TypeORM does not store this in DB, but we can use it in application logic.
   */
  get isLowStock(): boolean {
    return this.currentQuantity <= this.lowStockThreshold;
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
