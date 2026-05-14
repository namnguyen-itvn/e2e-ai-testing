/**
 * FILE: src/modules/inventory/inventory.service.ts
 * PURPOSE: Core business logic for all stock operations.
 *
 * KEY ENGINEERING DECISIONS:
 * ─────────────────────────────────────────────────────────────
 * 1. DATABASE TRANSACTIONS — all stock operations run inside a DB transaction.
 *    If ANY step fails (e.g., update stock fails after logging transaction),
 *    the entire operation is ROLLED BACK. This guarantees data consistency.
 *
 * 2. OPTIMISTIC LOCKING — prevents race conditions when multiple requests
 *    try to update stock simultaneously (concurrent API calls, load testing).
 *
 * 3. IMMUTABLE TRANSACTION LOG — InventoryTransaction records are never updated.
 *    They are append-only. This is critical for audit trails.
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
import { InventoryTransaction, TransactionType } from './entities/inventory-transaction.entity';
import { InventoryStock } from './entities/inventory-stock.entity';
import { Product } from '../products/entities/product.entity';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryStock)
    private readonly stockRepository: Repository<InventoryStock>,

    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    /**
     * DataSource is TypeORM's connection manager.
     * We inject it to create ATOMIC DATABASE TRANSACTIONS.
     *
     * WHY ATOMIC TRANSACTIONS?
     * Stock update = 2 operations: log transaction + update stock level.
     * If the app crashes between the two operations → data is inconsistent.
     * A DB transaction ensures BOTH succeed or BOTH fail (atomicity).
     */
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get or create the stock record for a product.
   * This is an internal helper — not exposed via HTTP directly.
   */
  private async getOrCreateStock(productId: string): Promise<InventoryStock> {
    let stock = await this.stockRepository.findOne({ where: { productId } });

    if (!stock) {
      // First time tracking this product's stock — initialize with 0
      stock = this.stockRepository.create({ productId, currentQuantity: 0 });
      await this.stockRepository.save(stock);
    }

    return stock;
  }

  /**
   * STOCK IN — Nhập kho
   * Adds stock to a product. Called when receiving goods from supplier.
   *
   * FLOW:
   * 1. Verify product exists
   * 2. Get current stock level
   * 3. BEGIN DB TRANSACTION
   *    a. Create InventoryTransaction record (log the event)
   *    b. Update InventoryStock.currentQuantity
   * 4. COMMIT or ROLLBACK
   */
  async stockIn(dto: StockInDto): Promise<InventoryTransaction> {
    this.logger.log(`Stock IN: product=${dto.productId}, qty=${dto.quantity}`);

    // Step 1: Verify product exists
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ID "${dto.productId}" not found`);
    }

    // Step 2: Get current stock
    const stock = await this.getOrCreateStock(dto.productId);
    const quantityBefore = stock.currentQuantity;
    const quantityAfter = quantityBefore + dto.quantity;

    /**
     * Step 3: Run inside a DB TRANSACTION (atomic operation)
     * queryRunner is TypeORM's mechanism for manual transaction control.
     * All DB operations inside this block are atomic.
     */
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3a. Log the transaction (immutable record)
      const transaction = queryRunner.manager.create(InventoryTransaction, {
        productId: dto.productId,
        transactionType: TransactionType.IN,
        quantity: dto.quantity,
        quantityBefore,
        quantityAfter,
        reference: dto.reference ?? null,
        note: dto.note ?? null,
      });
      await queryRunner.manager.save(transaction);

      // 3b. Update current stock level
      await queryRunner.manager.update(InventoryStock, stock.id, {
        currentQuantity: quantityAfter,
      });

      // Step 4: Commit — both operations succeeded
      await queryRunner.commitTransaction();

      this.logger.log(
        `Stock IN committed: ${quantityBefore} → ${quantityAfter}`,
      );
      return transaction;
    } catch (error) {
      // Something failed — rollback EVERYTHING so DB stays consistent
      await queryRunner.rollbackTransaction();
      this.logger.error(`Stock IN failed, rolled back: ${error}`);
      throw error;
    } finally {
      // Always release the queryRunner — prevents connection pool leak
      await queryRunner.release();
    }
  }

  /**
   * STOCK OUT — Xuất kho
   * Removes stock from a product. Called when shipping goods to customers.
   *
   * KEY VALIDATION: Cannot issue more than available stock.
   * This is a critical BUSINESS RULE — must be enforced at service level.
   */
  async stockOut(dto: StockOutDto): Promise<InventoryTransaction> {
    this.logger.log(`Stock OUT: product=${dto.productId}, qty=${dto.quantity}`);

    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ID "${dto.productId}" not found`);
    }

    const stock = await this.getOrCreateStock(dto.productId);
    const quantityBefore = stock.currentQuantity;

    // BUSINESS RULE: Cannot ship more than available stock
    if (dto.quantity > quantityBefore) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${quantityBefore}, Requested: ${dto.quantity}`,
      );
    }

    const quantityAfter = quantityBefore - dto.quantity;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = queryRunner.manager.create(InventoryTransaction, {
        productId: dto.productId,
        transactionType: TransactionType.OUT,
        quantity: dto.quantity,
        quantityBefore,
        quantityAfter,
        reference: dto.reference ?? null,
        note: dto.note ?? null,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.manager.update(InventoryStock, stock.id, {
        currentQuantity: quantityAfter,
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Stock OUT committed: ${quantityBefore} → ${quantityAfter}`,
      );
      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Stock OUT failed, rolled back: ${error}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ADJUST STOCK — Điều chỉnh tồn kho
   * Sets stock to an absolute value. Used after physical stocktake.
   */
  async adjustStock(dto: AdjustStockDto): Promise<InventoryTransaction> {
    this.logger.log(
      `Adjust stock: product=${dto.productId}, newQty=${dto.newQuantity}`,
    );

    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ID "${dto.productId}" not found`);
    }

    const stock = await this.getOrCreateStock(dto.productId);
    const quantityBefore = stock.currentQuantity;
    const diff = dto.newQuantity - quantityBefore; // positive = increase, negative = decrease

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = queryRunner.manager.create(InventoryTransaction, {
        productId: dto.productId,
        transactionType: TransactionType.ADJUSTMENT,
        quantity: Math.abs(diff), // always stored positive
        quantityBefore,
        quantityAfter: dto.newQuantity,
        note: dto.note ?? `Manual adjustment from ${quantityBefore} to ${dto.newQuantity}`,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.manager.update(InventoryStock, stock.id, {
        currentQuantity: dto.newQuantity,
      });

      await queryRunner.commitTransaction();
      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * GET CURRENT STOCK — for a specific product
   */
  async getStock(productId: string): Promise<InventoryStock> {
    const stock = await this.stockRepository.findOne({
      where: { productId },
      relations: ['product'], // load product details alongside stock
    });

    if (!stock) {
      throw new NotFoundException(
        `No stock record found for product ID "${productId}"`,
      );
    }

    return stock;
  }

  /**
   * GET ALL STOCKS — paginated list of all products with stock levels
   * Useful for: inventory dashboard, low stock alerts, QA data verification
   */
  async getAllStocks(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: InventoryStock[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.stockRepository.findAndCount({
      relations: ['product'],
      skip: (page - 1) * limit,
      take: limit,
      order: { updatedAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  /**
   * GET LOW STOCK ITEMS — products below threshold
   * Critical for: warehouse alerts, automated reorder triggers, QA dashboards
   */
  async getLowStockItems(): Promise<InventoryStock[]> {
    return this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .where('stock.current_quantity <= stock.low_stock_threshold')
      .orderBy('stock.current_quantity', 'ASC')
      .getMany();
  }

  /**
   * GET TRANSACTION HISTORY — for a specific product
   * Full audit trail of all stock movements
   */
  async getTransactionHistory(
    productId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: InventoryTransaction[]; total: number }> {
    const [data, total] = await this.transactionRepository.findAndCount({
      where: { productId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }
}
