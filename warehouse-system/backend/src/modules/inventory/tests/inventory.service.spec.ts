/**
 * FILE: src/modules/inventory/tests/inventory.service.spec.ts
 * PURPOSE: Unit tests for InventoryService — stockIn, stockOut, insufficient stock.
 *
 * CHALLENGE: InventoryService uses DataSource (queryRunner) for transactions.
 * We mock the entire queryRunner chain to test without a real database.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from '../inventory.service';
import { InventoryStock } from '../entities/inventory-stock.entity';
import { InventoryTransaction, TransactionType } from '../entities/inventory-transaction.entity';
import { Product, ProductStatus } from '../../products/entities/product.entity';

// ── QueryRunner Mock ────────────────────────────────────────────────────────
/**
 * The queryRunner mock is the trickiest part.
 * We mock the full chain: connect → startTransaction → manager → commit/rollback → release
 */
const createMockQueryRunner = () => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    create: jest.fn().mockImplementation((_entity, data) => data),
    save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'tx-uuid', ...data })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  },
});

const createMockDataSource = () => ({
  createQueryRunner: jest.fn(),
});

const createMockRepository = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('InventoryService', () => {
  let service: InventoryService;
  let stockRepository: ReturnType<typeof createMockRepository>;
  let productRepository: ReturnType<typeof createMockRepository>;
  let dataSource: ReturnType<typeof createMockDataSource>;
  let mockQueryRunner: ReturnType<typeof createMockQueryRunner>;

  const mockProduct: Product = {
    id: 'prod-uuid-001',
    sku: 'WH-001',
    name: 'Test Product',
    description: null,
    category: 'Test',
    price: 100,
    quantity: 0,
    unit: 'pcs',
    status: ProductStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStock: InventoryStock = {
    id: 'stock-uuid-001',
    productId: 'prod-uuid-001',
    product: mockProduct,
    currentQuantity: 50,
    lowStockThreshold: 10,
    get isLowStock() { return this.currentQuantity <= this.lowStockThreshold; },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockQueryRunner = createMockQueryRunner();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(InventoryStock), useValue: createMockRepository() },
        { provide: getRepositoryToken(InventoryTransaction), useValue: createMockRepository() },
        { provide: getRepositoryToken(Product), useValue: createMockRepository() },
        { provide: DataSource, useValue: createMockDataSource() },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    stockRepository = module.get(getRepositoryToken(InventoryStock));
    productRepository = module.get(getRepositoryToken(Product));
    dataSource = module.get(DataSource);

    // Wire the queryRunner mock to the DataSource mock
    dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  afterEach(() => jest.clearAllMocks());

  // ── stockIn() ─────────────────────────────────────────────────────

  describe('stockIn()', () => {
    const stockInDto = { productId: 'prod-uuid-001', quantity: 30, reference: 'PO-001' };

    it('should create a transaction and increase stock level', async () => {
      // ARRANGE
      productRepository.findOne.mockResolvedValue(mockProduct);
      stockRepository.findOne.mockResolvedValue(mockStock); // current = 50
      // Expected quantityAfter = 50 + 30 = 80

      // ACT
      const result = await service.stockIn(stockInDto);

      // ASSERT
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1); // transaction log
      expect(mockQueryRunner.manager.update).toHaveBeenCalledTimes(1); // stock update
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);

      // Verify the transaction record has correct values
      const savedTransaction = mockQueryRunner.manager.create.mock.calls[0][1];
      expect(savedTransaction.transactionType).toBe(TransactionType.IN);
      expect(savedTransaction.quantityBefore).toBe(50);
      expect(savedTransaction.quantityAfter).toBe(80);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      // ARRANGE
      productRepository.findOne.mockResolvedValue(null);

      // ASSERT
      await expect(service.stockIn(stockInDto)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      // ARRANGE
      productRepository.findOne.mockResolvedValue(mockProduct);
      stockRepository.findOne.mockResolvedValue(mockStock);
      // Simulate DB failure during save
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB connection lost'));

      // ASSERT
      await expect(service.stockIn(stockInDto)).rejects.toThrow('DB connection lost');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1); // Always released
    });
  });

  // ── stockOut() ────────────────────────────────────────────────────

  describe('stockOut()', () => {
    it('should decrease stock and create OUT transaction', async () => {
      // ARRANGE: current stock = 50, requesting 20
      productRepository.findOne.mockResolvedValue(mockProduct);
      stockRepository.findOne.mockResolvedValue({ ...mockStock, currentQuantity: 50 });

      // ACT
      await service.stockOut({ productId: 'prod-uuid-001', quantity: 20 });

      // ASSERT
      const savedTransaction = mockQueryRunner.manager.create.mock.calls[0][1];
      expect(savedTransaction.transactionType).toBe(TransactionType.OUT);
      expect(savedTransaction.quantityBefore).toBe(50);
      expect(savedTransaction.quantityAfter).toBe(30); // 50 - 20
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when requested quantity exceeds stock', async () => {
      // ARRANGE: only 10 in stock, requesting 50
      productRepository.findOne.mockResolvedValue(mockProduct);
      stockRepository.findOne.mockResolvedValue({ ...mockStock, currentQuantity: 10 });

      // ASSERT: this is the key business rule being tested
      await expect(
        service.stockOut({ productId: 'prod-uuid-001', quantity: 50 }),
      ).rejects.toThrow(BadRequestException);

      // Transaction must NOT have started if validation fails early
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should allow stockOut when quantity exactly equals current stock', async () => {
      // ARRANGE: stock = 10, request = 10 (edge case: exact depletion)
      productRepository.findOne.mockResolvedValue(mockProduct);
      stockRepository.findOne.mockResolvedValue({ ...mockStock, currentQuantity: 10 });

      // ACT & ASSERT: should NOT throw
      await expect(
        service.stockOut({ productId: 'prod-uuid-001', quantity: 10 }),
      ).resolves.toBeDefined();

      const savedTransaction = mockQueryRunner.manager.create.mock.calls[0][1];
      expect(savedTransaction.quantityAfter).toBe(0);
    });
  });
});
