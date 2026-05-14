/**
 * FILE: k6/smoke/inventory.smoke.js
 * PURPOSE: Smoke test for Inventory stock operations.
 *
 * WHAT WE VERIFY:
 *   - GET  /inventory/:productId/stock  → 200, returns stock level
 *   - POST /inventory/stock-in          → 201, increments stock
 *   - POST /inventory/stock-out         → 201, decrements stock
 *   - POST /inventory/stock-out (empty) → 400, prevents negative stock
 *
 * HOW TO RUN:
 *   k6 run k6/smoke/inventory.smoke.js
 *   k6 run --out json=k6/reports/inventory-smoke.json k6/smoke/inventory.smoke.js
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL } from '../setup/config.js';
import { authHeaders, JSON_HEADERS, uniqueSku, registerAndLogin } from '../setup/helpers.js';
import { getThresholds } from '../setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const stockInDuration  = new Trend('inventory_stock_in_duration', true);
const stockOutDuration = new Trend('inventory_stock_out_duration', true);
const getDuration      = new Trend('inventory_get_stock_duration', true);

// ── Smoke Options ─────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '15s', target: 1 },
        { duration: '5s',  target: 0 },
      ],
    },
  },
  thresholds: getThresholds('inventory', 'smoke'),
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Setup: create a product with known initial stock ───────────────────────
export function setup() {
  const token   = registerAndLogin('inventory_smoke');
  const headers = authHeaders(token);

  // Create a fresh product for inventory testing
  const res = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      sku:      uniqueSku(),
      name:     'Smoke Inventory Product',
      price:    10,
      quantity: 0,
      unit:     'pcs',
    }),
    { headers },
  );
  check(res, { 'smoke setup: product created → 201': (r) => r.status === 201 });

  const productId = res.json('id');

  // Seed initial stock: 100 units
  const stockRes = http.post(
    `${BASE_URL}/inventory/stock-in`,
    JSON.stringify({ productId, quantity: 100 }),
    { headers },
  );
  check(stockRes, { 'smoke setup: stock seeded → 201': (r) => r.status === 201 });

  return { token, productId };
}

// ── Default ───────────────────────────────────────────────────────────────
export default function (data) {
  const { token, productId } = data;
  const headers = authHeaders(token);

  // ── GROUP 1: Get current stock level
  group('GET /inventory/:productId/stock', () => {
    const res = http.get(`${BASE_URL}/inventory/stocks/${productId}`, { headers });
    getDuration.add(res.timings.duration);

    check(res, {
      'status is 200':             (r) => r.status === 200,
      'body has currentQuantity':  (r) => typeof r.json('currentQuantity') === 'number',
      'quantity is non-negative':  (r) => r.json('currentQuantity') >= 0,
      'response time < 2000ms':    (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.3);

  // ── GROUP 2: Stock-in (add 10 units)
  group('POST /inventory/stock-in', () => {
    const res = http.post(
      `${BASE_URL}/inventory/stock-in`,
      JSON.stringify({ productId, quantity: 10 }),
      { headers },
    );
    stockInDuration.add(res.timings.duration);

    check(res, {
      'status is 201':           (r) => r.status === 201,
      'response time < 2000ms':  (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.3);

  // ── GROUP 3: Stock-out (remove 5 units)
  group('POST /inventory/stock-out (valid)', () => {
    const res = http.post(
      `${BASE_URL}/inventory/stock-out`,
      JSON.stringify({ productId, quantity: 5 }),
      { headers },
    );
    stockOutDuration.add(res.timings.duration);

    check(res, {
      'status is 201 (fulfilled)': (r) => r.status === 201,
      'response time < 2000ms':    (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.3);

  // ── GROUP 4: Stock-out more than available → must be rejected
  group('POST /inventory/stock-out (exceeds stock → 400)', () => {
    const res = http.post(
      `${BASE_URL}/inventory/stock-out`,
      JSON.stringify({ productId, quantity: 9_999_999 }),
      { headers },
    );

    check(res, {
      'status is 400 (insufficient stock)': (r) => r.status === 400,
      'error message present':              (r) => typeof r.json('message') === 'string',
      'response time < 2000ms':             (r) => r.timings.duration < 2000,
    });
  });

  sleep(1);
}
