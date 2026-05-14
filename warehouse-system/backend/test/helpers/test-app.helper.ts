/**
 * FILE: test/helpers/test-app.helper.ts
 * PURPOSE: Shared setup/teardown logic for all E2E tests.
 *
 * E2E TEST PHILOSOPHY:
 * ─────────────────────────────────────────────────────────────
 * E2E tests spin up the REAL NestJS application with a REAL DB connection.
 * They test the full HTTP flow: request → validation → service → DB → response.
 *
 * IMPORTANT: Use a SEPARATE test database (warehouse_db_test) so E2E tests
 * never corrupt production or development data.
 *
 * Each test suite should:
 * 1. Create the app before all tests (beforeAll)
 * 2. Clean relevant tables before each test (beforeEach)
 * 3. Close the app after all tests (afterAll)
 * ─────────────────────────────────────────────────────────────
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as requestLib from 'supertest';
const request = (requestLib as any).default ?? requestLib;

import { AuthModule } from '../../src/modules/auth/auth.module';
import { ProductsModule } from '../../src/modules/products/products.module';
import { InventoryModule } from '../../src/modules/inventory/inventory.module';
import { OrdersModule } from '../../src/modules/orders/orders.module';
import { AuditModule } from '../../src/modules/audit/audit.module';
import { AuditInterceptor } from '../../src/modules/audit/interceptors/audit.interceptor';

/**
 * Creates a fully configured NestJS test application.
 * Uses the same .env but connects to warehouse_db_test database.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: `${process.env.DB_NAME}_test`, // ← test database!
        autoLoadEntities: true,
        synchronize: true,  // Always sync schema in test environment
        logging: false,     // Silence SQL logs during tests
        dropSchema: false,  // Don't drop tables between test runs (we clean manually)
      }),
      AuthModule,
      ProductsModule,
      InventoryModule,
      OrdersModule,
      AuditModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalInterceptors(app.get(AuditInterceptor));

  await app.init();
  return app;
}

/**
 * Helper to register + login a user and return their JWT token.
 * Used by tests that need authentication.
 */
export async function getAuthToken(
  app: INestApplication,
  user = {
    email: `test_${Date.now()}@warehouse.com`,
    firstName: 'Test',
    lastName: 'User',
    password: 'Test@1234',
    role: 'admin',
  },
): Promise<string> {
  await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(user);

  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });

  return loginRes.body.accessToken;
}
