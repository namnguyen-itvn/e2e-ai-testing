/**
 * FILE: src/config/database.config.ts
 * PURPOSE: Centralized, strongly-typed PostgreSQL configuration for TypeORM.
 *
 * ARCHITECTURE REASONING:
 * ─────────────────────────────────────────────────────────────
 * Instead of hardcoding database settings inside app.module.ts,
 * we extract them into a dedicated config factory.
 *
 * Benefits:
 * 1. Single Responsibility: config logic lives in one place
 * 2. Reusability: can be imported in tests, seeds, migrations
 * 3. Testability: easy to mock or override in unit tests
 * 4. Scalability: easy to add read replicas, connection pools, etc.
 *
 * CONCEPTS FOR BEGINNERS:
 * ─────────────────────────────────────────────────────────────
 * - ConfigService: NestJS service to read .env values safely
 * - TypeOrmModuleOptions: TypeScript type for all TypeORM settings
 * - registerAs: groups related configs under a namespace (e.g. 'database')
 * ─────────────────────────────────────────────────────────────
 */

import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * DATABASE CONFIG FACTORY
 *
 * `registerAs('database', ...)` creates a namespaced config group.
 * You can inject it anywhere using: @Inject(databaseConfig.KEY)
 *
 * This pattern is called "Configuration Namespacing" — it prevents
 * config key collisions in large enterprise projects.
 */
export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    // ── Connection Type ───────────────────────────────────────────
    // Tell TypeORM we are using PostgreSQL.
    // Other options: mysql, sqlite, mongodb, mssql
    type: 'postgres',

    // ── Connection Details ────────────────────────────────────────
    // Read from .env via process.env (ConfigModule loads them automatically)
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    // ── Entity Auto-Loading ───────────────────────────────────────
    // autoLoadEntities: true means TypeORM will automatically register
    // any Entity that is registered via forFeature() in a module.
    // You do NOT need to manually list every entity here.
    // This is the recommended approach for modular NestJS apps.
    autoLoadEntities: true,

    // ── Schema Synchronization ────────────────────────────────────
    // synchronize: true → TypeORM will auto-create/update DB tables
    // based on your Entity classes every time the app starts.
    //
    // ⚠️  WARNING — PRODUCTION DANGER:
    // NEVER use synchronize: true in production!
    // It can DROP columns or data if your entity changes.
    // In production, always use TypeORM Migrations instead.
    //
    // Safe rule: synchronize = true only when NODE_ENV = 'development'
    synchronize: process.env.DB_SYNCHRONIZE === 'true',

    // ── Query Logging ─────────────────────────────────────────────
    // logging: true → prints every SQL query to the console.
    // Extremely useful during development to understand what TypeORM
    // is doing under the hood. Turn OFF in production for performance.
    logging: process.env.DB_LOGGING === 'true',

    // ── SSL (Production) ──────────────────────────────────────────
    // Most cloud PostgreSQL providers (AWS RDS, Supabase, Neon) require SSL.
    // We disable it in development and enable it in production.
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,

    // ── Connection Pool ───────────────────────────────────────────
    // extra.max: maximum number of DB connections in the pool.
    // A pool reuses connections instead of creating new ones per request.
    // This is critical for performance under load (API testing, perf testing).
    extra: {
      max: 10, // max connections in pool (adjust based on DB plan)
    },
  }),
);
