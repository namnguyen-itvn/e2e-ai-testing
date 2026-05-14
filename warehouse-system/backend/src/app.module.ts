/**
 * FILE: src/app.module.ts
 * PURPOSE: Root module — the entry point of the NestJS application.
 *
 * ARCHITECTURE REASONING:
 * ─────────────────────────────────────────────────────────────
 * AppModule is the TOP-LEVEL module. Its only job is to IMPORT
 * other feature/infrastructure modules and wire them together.
 *
 * Think of AppModule as the "table of contents" of your app.
 * It should NEVER contain business logic, DB queries, or services.
 *
 * ENTERPRISE PATTERN: "Thin Root Module"
 * ─────────────────────────────────────────────────────────────
 * Each concern lives in its own module:
 * - ConfigModule  → environment/configuration
 * - DatabaseModule → database connection (TypeORM + PostgreSQL)
 * - (future) AuthModule, ProductsModule, InventoryModule, etc.
 *
 * This follows:
 * - Single Responsibility Principle (each module = one concern)
 * - Separation of Concerns (config, DB, features are isolated)
 * - Open/Closed Principle (add new modules without touching existing code)
 * ─────────────────────────────────────────────────────────────
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { OrdersModule } from './modules/orders/orders.module';

@Module({
  imports: [
    /**
     * ConfigModule — Global Environment Configuration
     * ──────────────────────────────────────────────────────────
     * ConfigModule reads your .env file and makes all variables
     * available throughout the entire application via ConfigService.
     *
     * isGlobal: true → You do NOT need to import ConfigModule in
     * every feature module. It is available everywhere automatically.
     *
     * envFilePath: '.env' → tells NestJS where to find the .env file.
     *
     * WHY THIS MATTERS FOR TESTING & CI/CD:
     * In automated tests or CI pipelines, you can override env vars
     * at the OS level without touching code. This is the 12-Factor App
     * principle: "Store config in the environment".
     */
    ConfigModule.forRoot({
      isGlobal: true,       // Available in all modules without re-importing
      envFilePath: '.env',  // Path to environment file (relative to project root)
    }),

    /**
     * DatabaseModule — PostgreSQL + TypeORM Connection
     * ──────────────────────────────────────────────────────────
     * All database setup is encapsulated inside DatabaseModule.
     * AppModule stays clean — it just imports the module.
     *
     * This means if you ever want to switch from TypeORM to Prisma,
     * you only change DatabaseModule — nothing else in AppModule changes.
     * That is the power of modular architecture.
     */
    DatabaseModule,

    ProductsModule,
    InventoryModule,
    AuthModule,
    AuditModule,
    OrdersModule,

    /**
     * FUTURE MODULES — Add here as you build them:
     *
     * AuthModule,         // Authentication & Authorization (JWT, roles)
     * ProductsModule,     // Product catalog management
     * InventoryModule,    // Stock tracking, warehouse locations
     * OrdersModule,       // Purchase & sales orders
     * AuditModule,        // Audit logs for all data changes
     * HealthModule,       // Health checks for monitoring & CI/CD
     */
  ],

  // Controllers handle HTTP requests. AppController is the default health/root controller.
  controllers: [AppController],

  // Providers are services with business logic. AppService is a simple example service.
  providers: [AppService],
})
export class AppModule {}
