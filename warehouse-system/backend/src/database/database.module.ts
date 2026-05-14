/**
 * FILE: src/database/database.module.ts
 * PURPOSE: Encapsulates all TypeORM/PostgreSQL setup in one dedicated module.
 *
 * ARCHITECTURE REASONING:
 * ─────────────────────────────────────────────────────────────
 * NestJS is built around the concept of MODULES.
 * Each module is responsible for one domain of functionality.
 *
 * By isolating database setup here, we achieve:
 * 1. Clean app.module.ts (thin root module)
 * 2. Easy to swap DB provider (e.g., switch to Prisma later)
 * 3. Easy to add DB health checks, connection retry logic here
 * 4. Testable in isolation
 *
 * CONCEPTS FOR BEGINNERS:
 * ─────────────────────────────────────────────────────────────
 * - TypeOrmModule.forRootAsync(): sets up the global DB connection.
 *   The "Async" version allows us to inject ConfigService so we can
 *   read .env values — the synchronous version cannot do this.
 *
 * - inject: [ConfigService] → tells NestJS to inject ConfigService
 *   into our useFactory function as a parameter.
 *
 * - useFactory: a function that returns config. NestJS calls this
 *   function during app bootstrap to build the TypeORM connection.
 * ─────────────────────────────────────────────────────────────
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // ConfigModule must be imported so ConfigService is available here.
      // Since we set ConfigModule as global in AppModule, this is optional,
      // but explicit imports make the module self-documenting.
      imports: [ConfigModule],

      // Inject ConfigService so we can read .env values inside useFactory
      inject: [ConfigService],

      /**
       * useFactory is called by NestJS during app startup.
       * It receives the injected ConfigService as a parameter.
       * It must return a TypeOrmModuleOptions object.
       *
       * Pattern: configService.get<Type>('key') reads from .env
       * The generic <Type> provides TypeScript type safety.
       */
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        // ── Connection Type ─────────────────────────────────────
        type: 'postgres',

        // ── Connection Details ──────────────────────────────────
        // configService.get() reads values loaded from .env by ConfigModule.
        // The second argument is a DEFAULT value (fallback if key is missing).
        // This prevents crashes during CI/CD or misconfigured environments.
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),

        // ── Entity Auto-Loading ─────────────────────────────────
        // NestJS will auto-register entities from all modules
        // that use TypeOrmModule.forFeature([YourEntity])
        autoLoadEntities: true,

        // ── Synchronize (DEV ONLY) ──────────────────────────────
        // Reads DB_SYNCHRONIZE from .env (string 'true'/'false')
        // and converts to boolean.
        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',

        // ── SQL Query Logging ───────────────────────────────────
        // When true, every SQL query is printed to the console.
        // Essential during development for debugging queries.
        // Set DB_LOGGING=false in production.
        logging: configService.get<string>('DB_LOGGING') === 'true',

        // ── SSL (Production-ready) ──────────────────────────────
        // Auto-enable SSL in production environments.
        // Required by most cloud PostgreSQL providers.
        ssl:
          configService.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,

        // ── Connection Pool ─────────────────────────────────────
        // Limits the maximum simultaneous database connections.
        // Prevents DB overload during high load (load testing, perf testing).
        extra: {
          max: 10,
        },
      }),
    }),
  ],
  // We export nothing here because TypeOrmModule.forRootAsync registers
  // the DB connection globally — all modules can use it automatically.
})
export class DatabaseModule {}
