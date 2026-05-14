/**
 * FILE: src/modules/orders/entities/order-item.entity.ts
 * PURPOSE: A single product line within an order.
 *
 * Each order has 1..N items. Each item references a product
 * and captures the price AT THE TIME of ordering (snapshot).
 *
 * WHY SNAPSHOT THE PRICE?
 * Product prices change over time. If you just reference the product,
 * the historical order value would change whenever the price changes.
 * Storing unitPrice at order time preserves the true order value.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Product, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'int' })
  quantity: number;

  /** Price per unit AT THE TIME the order was created — immutable snapshot */
  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  /** Line total = quantity × unitPrice (computed and stored for query performance) */
  @Column({ name: 'line_total', type: 'decimal', precision: 12, scale: 2 })
  lineTotal: number;
}
