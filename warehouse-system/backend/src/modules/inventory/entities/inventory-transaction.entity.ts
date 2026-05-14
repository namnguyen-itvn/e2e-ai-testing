/**
 * FILE: src/modules/inventory/entities/inventory-transaction.entity.ts
 * PURPOSE: Records every stock movement (IN/OUT/ADJUSTMENT) as an immutable log.
 *
 * DESIGN DECISION — WHY TRANSACTION LOG?
 * ─────────────────────────────────────────────────────────────
 * In warehouse systems, you NEVER just update a stock number directly.
 * Every stock change must be recorded as a transaction. This gives you:
 *
 * 1. Full audit trail → who changed what, when, and why
 * 2. Reconciliation   → sum of all transactions = current stock
 * 3. Compliance       → SOX, ISO require change history
 * 4. Debugging        → trace stock discrepancies back to root cause
 * 5. QA/Testing       → verify every action leaves a paper trail
 *
 * Think of it like a bank account:
 * - You never just "set balance = 500"
 * - You record "deposit +200" or "withdrawal -100"
 * - Balance = sum of all transactions
 * ─────────────────────────────────────────────────────────────
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

/**
 * Transaction Type Enum
 * IN  = nhập kho (receive stock)
 * OUT = xuất kho (ship/consume stock)
 * ADJUSTMENT = điều chỉnh tồn kho (manual correction, stocktake)
 */
export enum TransactionType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
}

@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * @ManyToOne → Many transactions belong to ONE product.
   * This creates a foreign key: inventory_transactions.product_id → products.id
   *
   * eager: false → product data is NOT auto-loaded with every query (performance)
   * onDelete: 'RESTRICT' → cannot delete a product that has transactions (data integrity)
   */
  @ManyToOne(() => Product, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Index()
  @Column({ name: 'product_id' })
  productId: string;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  /**
   * Quantity of this transaction.
   * Always stored as a POSITIVE number.
   * The transactionType (IN/OUT) determines if it adds or subtracts stock.
   * This avoids confusion of negative numbers in reports.
   */
  @Column({ type: 'int' })
  quantity: number;

  /**
   * Stock level BEFORE this transaction.
   * Stored for audit and reconciliation — you can replay history.
   */
  @Column({ name: 'quantity_before', type: 'int' })
  quantityBefore: number;

  /**
   * Stock level AFTER this transaction.
   * quantityAfter = quantityBefore + quantity (IN) or - quantity (OUT)
   */
  @Column({ name: 'quantity_after', type: 'int' })
  quantityAfter: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null; // e.g., PO number, sales order number

  @Column({ type: 'text', nullable: true })
  note: string | null; // human-readable reason for the transaction

  /**
   * Who performed this transaction.
   * Will be linked to User entity when AuthModule is built.
   * For now, stored as a plain string.
   */
  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  /**
   * Transactions are IMMUTABLE — no updatedAt, no soft delete.
   * Once created, a transaction record is never modified.
   * This is fundamental for audit integrity.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
