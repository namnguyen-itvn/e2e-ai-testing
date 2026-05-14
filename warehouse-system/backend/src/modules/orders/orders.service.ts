/**
 * FILE: src/modules/orders/orders.service.ts
 * PURPOSE: Order lifecycle management with inventory integration.
 *
 * KEY BUSINESS FLOWS:
 * ─────────────────────────────────────────────────────────────
 * CREATE:    Build order + items, calculate totals, status = PENDING
 * CONFIRM:   Validate stock (SALES orders), deduct inventory, status = CONFIRMED
 * FULFILL:   Mark as delivered/shipped, status = FULFILLED
 * CANCEL:    Return stock (if was CONFIRMED SALES), status = CANCELLED
 * ─────────────────────────────────────────────────────────────
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { InventoryStock } from '../inventory/entities/inventory-stock.entity';
import { InventoryTransaction, TransactionType } from '../inventory/entities/inventory-transaction.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(InventoryStock)
    private readonly stockRepository: Repository<InventoryStock>,

    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,

    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Order Number Generator ─────────────────────────────────────────

  private async generateOrderNumber(type: OrderType): Promise<string> {
    const prefix = type === OrderType.PURCHASE ? 'PO' : 'SO';
    const year = new Date().getFullYear();
    const count = await this.orderRepository.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${year}-${sequence}`;
  }

  // ── CREATE ─────────────────────────────────────────────────────────

  async create(dto: CreateOrderDto, performedBy?: string): Promise<Order> {
    this.logger.log(`Creating ${dto.type} order with ${dto.items.length} items`);

    // 1. Validate all products exist and get their current prices
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.productRepository.findByIds(productIds);

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missing = productIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Products not found: ${missing.join(', ')}`);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. Build order items with price snapshots
    let totalAmount = 0;
    const orderItems: Partial<OrderItem>[] = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * item.quantity;
      totalAmount += lineTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    // 3. Save order + items inside a DB transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderNumber = await this.generateOrderNumber(dto.type);

      const order = queryRunner.manager.create(Order, {
        orderNumber,
        type: dto.type,
        status: OrderStatus.PENDING,
        partnerName: dto.partnerName ?? null,
        partnerEmail: dto.partnerEmail ?? null,
        notes: dto.notes ?? null,
        totalAmount,
        createdBy: performedBy ?? null,
        items: orderItems as OrderItem[],
      });

      const saved = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      // Audit log
      await this.auditService.log({
        action: AuditAction.ORDER_CREATE,
        entityName: 'orders',
        entityId: saved.id,
        newValue: { orderNumber: saved.orderNumber, type: saved.type, totalAmount },
        performedBy: performedBy ?? null,
      });

      this.logger.log(`Order created: ${saved.orderNumber}`);
      return this.findOne(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ── CONFIRM ────────────────────────────────────────────────────────

  async confirm(id: string, performedBy?: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Only PENDING orders can be confirmed. Current status: ${order.status}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // For SALES orders: validate and deduct stock
      if (order.type === OrderType.SALES) {
        for (const item of order.items) {
          const stock = await this.stockRepository.findOne({
            where: { productId: item.productId },
          });

          if (!stock || stock.currentQuantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product "${item.product?.name}". ` +
              `Available: ${stock?.currentQuantity ?? 0}, Required: ${item.quantity}`,
            );
          }

          const newQty = stock.currentQuantity - item.quantity;

          // Deduct stock
          await queryRunner.manager.update(InventoryStock, stock.id, {
            currentQuantity: newQty,
          });

          // Log inventory transaction
          await queryRunner.manager.save(
            queryRunner.manager.create(InventoryTransaction, {
              productId: item.productId,
              transactionType: TransactionType.OUT,
              quantity: item.quantity,
              quantityBefore: stock.currentQuantity,
              quantityAfter: newQty,
              reference: order.orderNumber,
              note: `Sales order ${order.orderNumber} confirmed`,
            }),
          );
        }
      }

      await queryRunner.manager.update(Order, id, {
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      await queryRunner.commitTransaction();

      await this.auditService.log({
        action: AuditAction.ORDER_CONFIRM,
        entityName: 'orders',
        entityId: id,
        newValue: { status: OrderStatus.CONFIRMED },
        performedBy: performedBy ?? null,
      });

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ── FULFILL ────────────────────────────────────────────────────────

  async fulfill(id: string, performedBy?: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Only CONFIRMED orders can be fulfilled. Current status: ${order.status}`,
      );
    }

    await this.orderRepository.update(id, {
      status: OrderStatus.FULFILLED,
      fulfilledAt: new Date(),
    });

    await this.auditService.log({
      action: AuditAction.ORDER_FULFILL,
      entityName: 'orders',
      entityId: id,
      newValue: { status: OrderStatus.FULFILLED },
      performedBy: performedBy ?? null,
    });

    return this.findOne(id);
  }

  // ── CANCEL ─────────────────────────────────────────────────────────

  async cancel(id: string, performedBy?: string): Promise<Order> {
    const order = await this.findOne(id);

    if ([OrderStatus.FULFILLED, OrderStatus.CLOSED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException(`Cannot cancel an order with status: ${order.status}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Return stock if a SALES order was already CONFIRMED
      if (order.type === OrderType.SALES && order.status === OrderStatus.CONFIRMED) {
        for (const item of order.items) {
          const stock = await this.stockRepository.findOne({
            where: { productId: item.productId },
          });
          if (stock) {
            const newQty = stock.currentQuantity + item.quantity;
            await queryRunner.manager.update(InventoryStock, stock.id, {
              currentQuantity: newQty,
            });
            await queryRunner.manager.save(
              queryRunner.manager.create(InventoryTransaction, {
                productId: item.productId,
                transactionType: TransactionType.IN,
                quantity: item.quantity,
                quantityBefore: stock.currentQuantity,
                quantityAfter: newQty,
                reference: order.orderNumber,
                note: `Stock returned — order ${order.orderNumber} cancelled`,
              }),
            );
          }
        }
      }

      await queryRunner.manager.update(Order, id, {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      await queryRunner.commitTransaction();

      await this.auditService.log({
        action: AuditAction.ORDER_CANCEL,
        entityName: 'orders',
        entityId: id,
        newValue: { status: OrderStatus.CANCELLED },
        performedBy: performedBy ?? null,
      });

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ── QUERIES ────────────────────────────────────────────────────────

  async findAll(options: {
    status?: OrderStatus;
    type?: OrderType;
    page?: number;
    limit?: number;
  }): Promise<{ data: Order[]; total: number }> {
    const { page = 1, limit = 20, status, type } = options;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('order.status = :status', { status });
    if (type) qb.andWhere('order.type = :type', { type });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });
    if (!order) throw new NotFoundException(`Order ID "${id}" not found`);
    return order;
  }
}
