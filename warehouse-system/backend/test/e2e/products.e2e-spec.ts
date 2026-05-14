/**
 * FILE: test/e2e/products.e2e-spec.ts
 * PURPOSE: E2E tests for full Products CRUD lifecycle.
 */

import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as requestLib from 'supertest';
import { createTestApp, getAuthToken } from '../helpers/test-app.helper';

const request = (requestLib as any).default ?? requestLib;

describe('Products E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;

  const validProduct = {
    sku: 'E2E-SKU-001',
    name: 'E2E Test Laptop',
    description: 'Used in E2E tests',
    category: 'Electronics',
    price: 1299.99,
    quantity: 50,
    unit: 'pcs',
  };

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    authToken = await getAuthToken(app);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM inventory_transactions');
    await dataSource.query('DELETE FROM inventory_stocks');
    await dataSource.query('DELETE FROM order_items');
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM products');
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM inventory_transactions');
    await dataSource.query('DELETE FROM inventory_stocks');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM users');
    await app.close();
  });

  // ── POST /api/products ──────────────────────────────────────────

  describe('POST /api/products', () => {
    it('201 — should create a product with all fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/products')
        .send(validProduct)
        .expect(201);

      expect(res.body).toMatchObject({
        sku: validProduct.sku,
        name: validProduct.name,
        status: 'active',
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
    });

    it('409 — should reject duplicate SKU', async () => {
      await request(app.getHttpServer()).post('/api/products').send(validProduct);
      await request(app.getHttpServer())
        .post('/api/products')
        .send(validProduct)
        .expect(409);
    });

    it('400 — should reject missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/products')
        .send({ name: 'No SKU or price' })
        .expect(400);

      expect(res.body.message).toBeInstanceOf(Array);
    });

    it('400 — should reject negative price', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .send({ ...validProduct, price: -10 })
        .expect(400);
    });
  });

  // ── GET /api/products ───────────────────────────────────────────

  describe('GET /api/products', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/api/products').send(validProduct);
    });

    it('200 — should return paginated product list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .expect(200);

      expect(res.body).toMatchObject({
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(res.body.data).toHaveLength(1);
    });

    it('200 — should respect pagination params', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products?page=2&limit=5')
        .expect(200);

      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(5);
    });
  });

  // ── FULL E2E LIFECYCLE ─────────────────────────────────────────

  describe('Full E2E lifecycle', () => {
    it('should create → read → update → delete a product', async () => {
      // CREATE
      const createRes = await request(app.getHttpServer())
        .post('/api/products')
        .send(validProduct)
        .expect(201);
      const productId = createRes.body.id;

      // READ by ID
      const getRes = await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .expect(200);
      expect(getRes.body.sku).toBe(validProduct.sku);

      // READ by SKU
      await request(app.getHttpServer())
        .get(`/api/products/sku/${validProduct.sku}`)
        .expect(200);

      // UPDATE (PATCH)
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .send({ name: 'Updated Laptop Name', price: 999.99 })
        .expect(200);
      expect(patchRes.body.name).toBe('Updated Laptop Name');
      expect(Number(patchRes.body.price)).toBe(999.99);

      // SOFT DELETE
      await request(app.getHttpServer())
        .delete(`/api/products/${productId}`)
        .expect(204);

      // Verify product is gone from normal queries
      await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .expect(404);
    });
  });
});
