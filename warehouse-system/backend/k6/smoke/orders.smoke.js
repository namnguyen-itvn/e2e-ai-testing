/**
 * FILE: k6/smoke/orders.smoke.js
 * PURPOSE: Smoke test for the full Order lifecycle.
 *
 *   let orderId = null;
  group('POST /orders (create → pend  // ── GROUP 4: Confirm the or  // ── GROUP 5: Fulfill the order (confirmed → fulfilled)
  group('POST /orders/:id/fulfill (confirmed → fulfilled)', () => {
    const res = http.post(
      `${BASE_URL}/orders/${orderId}/fulfill`,
      null,
      { headers },
    );
    fulfillDuration.add(res.timings.duration);

    check(res, {
      'status is 200':          (r) => r.status === 200,
      'status is fulfilled':    (r) => r.json('status') === 'fulfilled',
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });confirmed, deducts stock)
  group('POST /orders/:id/confirm (pending → confirmed)', () => {
    const res = http.post(
      `${BASE_URL}/orders/${orderId}/confirm`,
      null,
      { headers },
    );
    confirmDuration.add(res.timings.duration);

    check(res, {
      'status is 200':          (r) => r.status === 200,
      'status is confirmed':    (r) => r.json('status') === 'confirmed',
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });    const res = http.post(
      `${BASE_URL}/orders`,
      JSON.stringify({
        type:  'sales',
        items: [{ productId, quantity: 1 }],
        notes: `Smoke test order VU${__VU} Iter${__ITER}`,
      }),
      { headers },
    );
    createDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 201':            (r) => r.status === 201,
      'body has id':              (r) => typeof r.json('id') === 'string',
      'status is pending':        (r) => r.json('status') === 'pending',
      'response time < 2000ms':   (r) => r.timings.duration < 2000,
    });
    if (ok) orderId = res.json('id');
  });e machine):
 *   POST /orders              → creates order (status: PENDING)
 *   PATCH /orders/:id/confirm → transitions to CONFIRMED + deducts inventory
 *   PATCH /orders/:id/fulfill → transitions to FULFILLED
 *   PATCH /orders/:id/cancel  → cancels a pending order, restores stock
 *   GET  /orders              → lists orders
 *   GET  /orders/:id          → gets single order
 *
 * HOW TO RUN:
 *   k6 run k6/smoke/orders.smoke.js
 *   k6 run --out json=k6/reports/orders-smoke.json k6/smoke/orders.smoke.js
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL } from '../setup/config.js';
import { authHeaders, uniqueSku, registerAndLogin } from '../setup/helpers.js';
import { getThresholds } from '../setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const createDuration  = new Trend('orders_create_duration', true);
const confirmDuration = new Trend('orders_confirm_duration', true);
const fulfillDuration = new Trend('orders_fulfill_duration', true);
const listDuration    = new Trend('orders_list_duration', true);

// ── Smoke Options ─────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '20s', target: 1 },  // Orders have more steps — give more time
        { duration: '5s',  target: 0 },
      ],
    },
  },
  thresholds: getThresholds('orders', 'smoke'),
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Setup: prepare product + seed inventory ────────────────────────────────
export function setup() {
  const token   = registerAndLogin('orders_smoke');
  const headers = authHeaders(token);

  // Create product
  const productRes = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      sku:      uniqueSku(),
      name:     'Smoke Order Product',
      price:    25.00,
      quantity: 0,
      unit:     'pcs',
    }),
    { headers },
  );
  check(productRes, { 'smoke setup: product created → 201': (r) => r.status === 201 });
  const productId = productRes.json('id');

  // Seed stock: 1000 units so smoke test has plenty to work with
  const stockRes = http.post(
    `${BASE_URL}/inventory/stock-in`,
    JSON.stringify({ productId, quantity: 1000 }),
    { headers },
  );
  check(stockRes, { 'smoke setup: stock seeded → 201': (r) => r.status === 201 });

  return { token, productId };
}

// ── Default: full order lifecycle per iteration ────────────────────────────
export default function (data) {
  const { token, productId } = data;
  const headers = authHeaders(token);

  // ── GROUP 1: List existing orders
  group('GET /orders (paginated list)', () => {
    const res = http.get(`${BASE_URL}/orders?page=1&limit=10`, { headers });
    listDuration.add(res.timings.duration);

    check(res, {
      'status is 200':          (r) => r.status === 200,
      'body has data array':    (r) => Array.isArray(r.json('data')),
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.3);

  // ── GROUP 2: Create a new order (pending)
  let orderId = null;
  group('POST /orders (create → pending)', () => {
    const res = http.post(
      `${BASE_URL}/orders`,
      JSON.stringify({
        type:  'sales',
        items: [{ productId, quantity: 2 }],
        notes: `Smoke test order VU${__VU} Iter${__ITER}`,
      }),
      { headers },
    );
    createDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 201':           (r) => r.status === 201,
      'body has id':             (r) => typeof r.json('id') === 'string',
      'status is pending':       (r) => r.json('status') === 'pending',
      'response time < 2000ms':  (r) => r.timings.duration < 2000,
    });
    if (ok) orderId = res.json('id');
  });

  sleep(0.3);

  if (!orderId) return; // Cannot continue without an order

  // ── GROUP 3: Get the order by ID
  group('GET /orders/:id (single)', () => {
    const res = http.get(`${BASE_URL}/orders/${orderId}`, { headers });

    check(res, {
      'status is 200':           (r) => r.status === 200,
      'id matches':              (r) => r.json('id') === orderId,
      'response time < 2000ms':  (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.3);

  // ── GROUP 4: Confirm order (pending → confirmed) — POST not PATCH
  group('POST /orders/:id/confirm (pending → confirmed)', () => {
    const res = http.post(
      `${BASE_URL}/orders/${orderId}/confirm`,
      null,
      { headers },
    );
    confirmDuration.add(res.timings.duration);

    check(res, {
      'status is 200':           (r) => r.status === 200,
      'status is confirmed':     (r) => r.json('status') === 'confirmed',
      'response time < 2000ms':  (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.3);

  // ── GROUP 5: Fulfill order (confirmed → fulfilled) — POST not PATCH
  group('POST /orders/:id/fulfill (confirmed → fulfilled)', () => {
    const res = http.post(
      `${BASE_URL}/orders/${orderId}/fulfill`,
      null,
      { headers },
    );
    fulfillDuration.add(res.timings.duration);

    check(res, {
      'status is 200':           (r) => r.status === 200,
      'status is fulfilled':     (r) => r.json('status') === 'fulfilled',
      'response time < 2000ms':  (r) => r.timings.duration < 2000,
    });
  });

  sleep(1);
}
