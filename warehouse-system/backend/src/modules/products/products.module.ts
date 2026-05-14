/**
 * FILE: src/modules/products/products.module.ts
 * PURPOSE: NestJS module that wires together the Products feature.
 *
 * CONCEPT — MODULE:
 * ─────────────────────────────────────────────────────────────
 * A NestJS Module is a self-contained unit of functionality.
 * It declares:
 * - imports:     other modules this module depends on
 * - controllers: HTTP handlers for this feature
 * - providers:   services, repositories, and other injectable classes
 * - exports:     what other modules can use from this module
 *
 * TypeOrmModule.forFeature([Product]) → registers the Product entity
 * with TypeORM so that @InjectRepository(Product) works in the service.
 * ─────────────────────────────────────────────────────────────
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    // Register the Product entity with TypeORM for this module.
    // This enables @InjectRepository(Product) in ProductsService.
    TypeOrmModule.forFeature([Product]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  // Export ProductsService so other modules (e.g., InventoryModule) can use it
  exports: [ProductsService],
})
export class ProductsModule {}
