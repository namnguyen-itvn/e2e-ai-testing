/**
 * FILE: src/modules/orders/entities/order.entity.ts
 * PURPOSE: Represents a purchase/sales order with a full lifecycle state machine.
 *
 * ORDER LIFECYCLE (State Machine):
 * ─────────────────────────────────────────────────────────────
 *
 *   PENDING ──► CONFIRMED ──► FULFILLED ──► CLOSED
 *      │             │
 *      └─────────────┴──────► CANCELLED
 *
 * - PENDING:   Order created, awaiting confirmation
 * - CONFIRMED: Confirmed, stock reserved/deducted
 * - FULFILLED: Goods shipped/delivered
 * - CANCELLED: Order cancelled (stock returned if was confirmed)
 * - CLOSED:    Archived completed order
 *
 * WHY STATE MACHINE?
 * Prevents invalid transitions (e.g., cannot FULFILL a CANCELLED order).
 * This is a fundamental pattern in order management, warehouse, and ERP systems.
 * ─────────────────────────────────────────────────────────────
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING    = 'pending',
  CONFIRMED  = 'confirmed',
  FULFILLED  = 'fulfilled',
  CANCELLED  = 'cancelled',
  CLOSED     = 'closed',
}

export enum OrderType {
  PURCHASE = 'purchase', // Buying goods from supplier (stock IN)
  SALES    = 'sales',    // Selling goods to customer (stock OUT)
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Human-readable order number for display and reference.
   * Format: PO-2026-0001 (purchase) or SO-2026-0001 (sales)
   */
  @Index({ unique: true })
  @Column({ name: 'order_number', type: 'varchar', length: 50 })
  orderNumber: string;

  @Column({ type: 'enum', enum: OrderType })
  type: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  /** Supplier or customer name */
  @Column({ name: 'partner_name', type: 'varchar', length: 255, nullable: true })
  partnerName: string | null;

  @Column({ name: 'partner_email', type: 'varchar', length: 255, nullable: true })
  partnerEmail: string | null;

  /**
   * Total order value — computed from order items, cached here for performance.
   * Avoids recalculating SUM(items) on every read.
   */
  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'fulfilled_at', type: 'timestamptz', nullable: true })
  fulfilledAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  /**
   * @OneToMany → One order has many line items (OrderItem).
   * cascade: true → saving an Order also saves its OrderItems.
   * eager: false → items are NOT auto-loaded (use relations: ['items'] when needed).
   */
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
