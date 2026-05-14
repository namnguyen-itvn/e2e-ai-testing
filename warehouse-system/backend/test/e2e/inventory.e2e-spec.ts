/**
 * FILE: test/e2e/inventory.e2e-spec.ts
 * PURPOSE: E2E tests for Inventory — stockIn, stockOut, history, low stock.
 */

import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as requestLib from 'supertest';
import { createTestApp } from '../helpers/test-app.helper';

const request = (requestLib as any).default ?? requestLib;

describe('Inventory E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let productId: string;

  const testProduct = {
    sku: `INV-E2E-${Date.now()}`,
    name: 'Inventory Test Product',
    price: 50,
    quantity: 0,
    unit: 'pcs',
  };

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

    // Create a product to use in inventory tests
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .send(testProduct);
    productId = res.body.id;
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM inventory_transactions');
    await dataSource.query('DELETE FROM inventory_stocks');
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM inventory_transactions');
    await dataSource.query('DELETE FROM inventory_stocks');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM users');
    await app.close();
  });

  // ── POST /api/inventory/stock-in ────────────────────────────────

  describe('POST /api/inventory/stock-in', () => {
    it('201 — should receive stock and create transaction log', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory/stock-in')
        .send({ productId, quantity: 100, reference: 'PO-E2E-001' })
        .expect(201);

      expect(res.body.transactionType).toBe('in');
      expect(res.body.quantity).toBe(100);
      expect(res.body.quantityBefore).toBe(0);
      expect(res.body.quantityAfter).toBe(100);
    });

    it('404 — should reject stock-in for non-existent product', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory/stock-in')
        .send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 10 })
        .expect(404);
    });
  });

  // ── POST /api/inventory/stock-out ───────────────────────────────

  describe('POST /api/inventory/stock-out', () => {
    beforeEach(async () => {
      // Seed stock before each test
      await request(app.getHttpServer())
        .post('/api/inventory/stock-in')
        .send({ productId, quantity: 50 });
    });

    it('201 — should issue stock successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory/stock-out')
        .send({ productId, quantity: 20 })
        .expect(201);

      expect(res.body.transactionType).toBe('out');
      expect(res.body.quantityBefore).toBe(50);
      expect(res.body.quantityAfter).toBe(30);
    });

    it('400 — should reject stock-out exceeding available quantity', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory/stock-out')
        .send({ productId, quantity: 999 }) // only 50 available
        .expect(400);

      expect(res.body.message).toContain('Insufficient stock');
    });
  });

  // ── Full Inventory Lifecycle ─────────────────────────────────────

  describe('Full inventory lifecycle', () => {
    it('should stockIn → stockOut → verify history and current stock', async () => {
      // Step 1: Receive 100 units
      await request(app.getHttpServer())
        .post('/api/inventory/stock-in')
        .send({ productId, quantity: 100, reference: 'PO-001' });

      // Step 2: Issue 30 units
      await request(app.getHttpServer())
        .post('/api/inventory/stock-out')
        .send({ productId, quantity: 30, reference: 'SO-001' });

      // Step 3: Verify current stock = 70
      const stockRes = await request(app.getHttpServer())
        .get(`/api/inventory/stocks/${productId}`)
        .expect(200);
      expect(stockRes.body.currentQuantity).toBe(70);

      // Step 4: Verify transaction history has 2 records
      const historyRes = await request(app.getHttpServer())
        .get(`/api/inventory/history/${productId}`)
        .expect(200);
      expect(historyRes.body.total).toBe(2);
      expect(historyRes.body.data[0].transactionType).toBe('out'); // newest first
      expect(historyRes.body.data[1].transactionType).toBe('in');
    });
  });
});
