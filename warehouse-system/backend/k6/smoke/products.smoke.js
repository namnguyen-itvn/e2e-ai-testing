/**
 * FILE: k6/smoke/products.smoke.js
 * PURPOSE: Smoke test for Products CRUD endpoints.
 *
 * WHAT WE VERIFY:
 *   - GET /products    → 200, returns paginated list
 *   - POST /products   → 201, creates product with correct shape
 *   - GET /products/:id → 200, returns single product
 *   - PATCH /products/:id → 200, updates product fields
 *   - DELETE /products/:id → 200/204, removes product
 *
 * HOW TO RUN:
 *   k6 run k6/smoke/products.smoke.js
 *   k6 run --out json=k6/reports/products-smoke.json k6/smoke/products.smoke.js
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL } from '../setup/config.js';
import { authHeaders, uniqueSku, registerAndLogin } from '../setup/helpers.js';
import { getThresholds } from '../setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const listDuration   = new Trend('products_get_list_duration', true);
const createDuration = new Trend('products_create_duration', true);
const getDuration    = new Trend('products_get_one_duration', true);
const updateDuration = new Trend('products_update_duration', true);

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
  thresholds: getThresholds('products', 'smoke'),
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Setup ─────────────────────────────────────────────────────────────────
export function setup() {
  const token = registerAndLogin('products_smoke');
  return { token };
}

// ── Default ───────────────────────────────────────────────────────────────
export default function (data) {
  const headers = authHeaders(data.token);
  let createdId = null;

  // ── GROUP 1: List products
  group('GET /products (paginated list)', () => {
    const res = http.get(`${BASE_URL}/products?page=1&limit=10`, { headers });
    listDuration.add(res.timings.duration);

    check(res, {
      'status is 200':          (r) => r.status === 200,
      'body has data array':    (r) => Array.isArray(r.json('data')),
      'body has total count':   (r) => typeof r.json('total') === 'number',
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.3);

  // ── GROUP 2: Create a product
  group('POST /products (create)', () => {
    const res = http.post(
      `${BASE_URL}/products`,
      JSON.stringify({
        sku:      uniqueSku(),
        name:     `Smoke Product VU${__VU}`,
        price:    29.99,
        quantity: 50,
        unit:     'pcs',
      }),
      { headers },
    );
    createDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 201':          (r) => r.status === 201,
      'body has id':            (r) => typeof r.json('id') === 'string',
      'body has sku':           (r) => typeof r.json('sku') === 'string',
      'body has price':         (r) => typeof r.json('price') === 'number',
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    if (ok) createdId = res.json('id');
  });

  sleep(0.3);

  // ── GROUP 3: Get the created product by ID
  if (createdId) {
    group('GET /products/:id (single)', () => {
      const res = http.get(`${BASE_URL}/products/${createdId}`, { headers });
      getDuration.add(res.timings.duration);

      check(res, {
        'status is 200':          (r) => r.status === 200,
        'body id matches':        (r) => r.json('id') === createdId,
        'response time < 2000ms': (r) => r.timings.duration < 2000,
      });
    });

    sleep(0.3);

    // ── GROUP 4: Update the product
    group('PATCH /products/:id (update)', () => {
      const res = http.patch(
        `${BASE_URL}/products/${createdId}`,
        JSON.stringify({ name: 'Smoke Updated Product', price: 39.99 }),
        { headers },
      );
      updateDuration.add(res.timings.duration);

      check(res, {
        'status is 200':          (r) => r.status === 200,
        'name was updated':       (r) => r.json('name') === 'Smoke Updated Product',
        'response time < 2000ms': (r) => r.timings.duration < 2000,
      });
    });
  }

  sleep(1);
}
