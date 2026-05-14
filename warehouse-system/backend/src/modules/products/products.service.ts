/**
 * FILE: src/modules/products/products.service.ts
 * PURPOSE: Business logic for all product operations.
 *
 * CONCEPT — SERVICE LAYER:
 * ─────────────────────────────────────────────────────────────
 * The Service is where business logic lives. It sits between:
 *   Controller (HTTP) → Service (Logic) → Repository (DB)
 *
 * Rules:
 * - Controllers NEVER touch the database directly
 * - Services NEVER handle HTTP request/response details
 * - This separation makes unit testing straightforward:
 *   you can test service logic without HTTP or DB
 *
 * SOLID PRINCIPLE APPLIED:
 * - Single Responsibility: Service only handles business logic
 * - Dependency Inversion: Service depends on Repository abstraction
 * ─────────────────────────────────────────────────────────────
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  /**
   * NestJS Logger — structured logging with context.
   * Always use Logger instead of console.log in production code.
   * Logs include timestamps, log levels (log/warn/error), and context name.
   */
  private readonly logger = new Logger(ProductsService.name);

  /**
   * @InjectRepository(Product) → injects the TypeORM Repository for Product entity.
   * The Repository provides all DB operations: find, save, update, delete, etc.
   *
   * This is Dependency Injection in action — NestJS creates and injects
   * the repository automatically. We never call `new Repository()` manually.
   */
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * CREATE a new product.
   * Checks for duplicate SKU first — business rule: SKU must be unique.
   */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`);

    // Business Rule: SKU must be unique across all products
    const existing = await this.productRepository.findOne({
      where: { sku: createProductDto.sku },
    });

    if (existing) {
      // ConflictException → HTTP 409 Conflict
      throw new ConflictException(
        `Product with SKU "${createProductDto.sku}" already exists`,
      );
    }

    // create() builds a new entity instance from the DTO
    // save() persists it to PostgreSQL and returns the saved entity (with id, timestamps)
    const product = this.productRepository.create(createProductDto);
    const saved = await this.productRepository.save(product);

    this.logger.log(`Product created successfully with ID: ${saved.id}`);
    return saved;
  }

  /**
   * FIND ALL products with optional pagination.
   * Pagination is critical for performance — never return unlimited rows.
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    this.logger.log(`Fetching products - page: ${page}, limit: ${limit}`);

    // findAndCount returns [rows, totalCount] in one DB query
    const [data, total] = await this.productRepository.findAndCount({
      skip: (page - 1) * limit, // offset: skip rows from previous pages
      take: limit,              // limit: max rows to return
      order: { createdAt: 'DESC' }, // newest products first
    });

    return { data, total, page, limit };
  }

  /**
   * FIND ONE product by ID.
   * Throws 404 if not found — standard REST behavior.
   */
  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      // NotFoundException → HTTP 404 Not Found
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  /**
   * FIND ONE product by SKU.
   * Useful for inventory lookups and barcode scanning scenarios.
   */
  async findBySku(sku: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { sku } });

    if (!product) {
      throw new NotFoundException(`Product with SKU "${sku}" not found`);
    }

    return product;
  }

  /**
   * UPDATE a product partially (PATCH).
   * Only updates the fields provided in the DTO.
   */
  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    this.logger.log(`Updating product ID: ${id}`);

    // First verify the product exists → throws 404 if not
    const product = await this.findOne(id);

    // If SKU is being changed, check the new SKU is not taken
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const skuTaken = await this.productRepository.findOne({
        where: { sku: updateProductDto.sku },
      });
      if (skuTaken) {
        throw new ConflictException(
          `SKU "${updateProductDto.sku}" is already in use`,
        );
      }
    }

    // merge() applies the DTO fields onto the existing entity object
    // then save() persists the changes
    const updated = await this.productRepository.save(
      this.productRepository.merge(product, updateProductDto),
    );

    this.logger.log(`Product ${id} updated successfully`);
    return updated;
  }

  /**
   * SOFT DELETE a product.
   * Sets deletedAt timestamp instead of removing the row.
   * The product becomes invisible in all normal queries.
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Soft deleting product ID: ${id}`);

    // Verify exists first
    await this.findOne(id);

    // softDelete() sets the deletedAt column — does NOT remove the row
    await this.productRepository.softDelete(id);

    this.logger.log(`Product ${id} soft deleted`);
  }
}
