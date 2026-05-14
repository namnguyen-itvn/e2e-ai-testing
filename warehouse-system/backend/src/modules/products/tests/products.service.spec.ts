/**
 * FILE: src/modules/products/tests/products.service.spec.ts
 * PURPOSE: Unit tests for ProductsService — CRUD, conflict, not found.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products.service';
import { Product, ProductStatus } from '../entities/product.entity';

const createMockRepository = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  softDelete: jest.fn(),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: ReturnType<typeof createMockRepository>;

  const mockProduct: Product = {
    id: 'prod-uuid-001',
    sku: 'WH-001',
    name: 'Test Laptop',
    description: 'A test laptop',
    category: 'Electronics',
    price: 999.99,
    quantity: 50,
    unit: 'pcs',
    status: ProductStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => jest.clearAllMocks());

  // ── create() ──────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto = {
      sku: 'WH-NEW',
      name: 'New Product',
      price: 100,
      quantity: 10,
    };

    it('should create and return a product', async () => {
      // ARRANGE
      productRepository.findOne.mockResolvedValue(null); // SKU not taken
      productRepository.create.mockReturnValue(mockProduct);
      productRepository.save.mockResolvedValue(mockProduct);

      // ACT
      const result = await service.create(createDto as any);

      // ASSERT
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { sku: createDto.sku },
      });
      expect(productRepository.save).toHaveBeenCalledTimes(1);
      expect(result.sku).toBe(mockProduct.sku);
    });

    it('should throw ConflictException when SKU already exists', async () => {
      // ARRANGE: SKU is already in use
      productRepository.findOne.mockResolvedValue(mockProduct);

      // ASSERT
      await expect(service.create(createDto as any)).rejects.toThrow(
        ConflictException,
      );
      expect(productRepository.save).not.toHaveBeenCalled();
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated products with total count', async () => {
      // ARRANGE
      productRepository.findAndCount.mockResolvedValue([[mockProduct], 1]);

      // ACT
      const result = await service.findAll(1, 20);

      // ASSERT
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      // Verify correct pagination params were passed
      expect(productRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should calculate correct skip value for page 2', async () => {
      productRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(2, 10);
      expect(productRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return a product when found', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      const result = await service.findOne('prod-uuid-001');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove() ─────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft delete a product', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      productRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('prod-uuid-001');

      expect(productRepository.softDelete).toHaveBeenCalledWith('prod-uuid-001');
    });

    it('should throw NotFoundException when product to delete does not exist', async () => {
      productRepository.findOne.mockResolvedValue(null);
      await expect(service.remove('ghost-id')).rejects.toThrow(NotFoundException);
      expect(productRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
