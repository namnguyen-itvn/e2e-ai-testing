/**
 * FILE: k6/stress/orders.stress.js
 * PURPOSE: Stress test the full Order lifecycle under high concurrency.
 *
 * COMPOUND STRESS SCENARIO:
 * ─────────────────────────────────────────────────────────────
 * Orders are the MOST complex operation in this system because:
 *   1. Creating an order is a write (INSERT to orders table)
 *   2. Confirming an order ALSO deducts inventory (cross-table transaction)
 *   3. If inventory deduction and order state update aren't atomic,
 *      we can end up with confirmed orders with no stock deducted — a bug.
 *
 * This stress test runs 50-70 VUs all simultaneously:
 *   - Creating new orders (INSERT flood)
 *   - Confirming different orders (cross-table transaction flood)
 *   - Reading the order list (read under write pressure)
 *
 * WHAT TO WATCH:
 *   - orders_confirm_duration p99: confirm is the most expensive op
 *   - orders_created vs orders_confirmed: they should be ≈ equal
 *   - 0% unexpected 5xx errors (4xx from business rules are ok)
 *
 * HOW TO RUN:
 *   k6 run k6/stress/orders.stress.js
 *   k6 run --out json=k6/reports/orders-stress.json k6/stress/orders.stress.js
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { BASE_URL } from '../setup/config.js';
import { authHeaders, uniqueSku, registerAndLogin } from '../setup/helpers.js';
import { getThresholds } from '../setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const createDuration   = new Trend('orders_create_duration', true);
const confirmDuration  = new Trend('orders_confirm_duration', true);
const fulfillDuration  = new Trend('orders_fulfill_duration', true);
const listDuration     = new Trend('orders_list_duration', true);
const ordersCreated    = new Counter('orders_created');
const ordersConfirmed  = new Counter('orders_confirmed');
const ordersFulfilled  = new Counter('orders_fulfilled');
const orderErrorRate   = new Rate('orders_error_rate');

// ── Stress Options ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10  },  // Warm-up: sequential orders
        { duration: '30s', target: 30  },  // Normal load
        { duration: '1m',  target: 50  },  // Stress: concurrent order creation
        { duration: '30s', target: 70  },  // Maximum stress
        { duration: '1m',  target: 70  },  // Sustain — look for deadlocks/timeouts
        { duration: '30s', target: 10  },  // Recovery
        { duration: '20s', target: 0   },
      ],
    },
  },
  thresholds: {
    ...getThresholds('orders', 'stress'),
    'orders_error_rate': ['rate<0.02'],  // < 2% unexpected errors
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Setup: product with massive stock for order stress test ────────────────
export function setup() {
  const token   = registerAndLogin('orders_stress');
  const headers = authHeaders(token);

  // Create product with very large stock: all VUs create 1-unit orders
  // 70 VUs × 4 iters/min × 4min = ~1,120 orders — seed enough stock
  const productRes = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      sku:      `STRESS-ORD-${Date.now()}`,
      name:     'Stress Order Product',
      price:    15.00,
      quantity: 0,
      unit:     'pcs',
    }),
    { headers },
  );
  check(productRes, { 'setup: product created → 201': (r) => r.status === 201 });
  const productId = productRes.json('id');

  // Seed 50,000 units — more than enough for any stress scenario
  const stockRes = http.post(
    `${BASE_URL}/inventory/stock-in`,
    JSON.stringify({ productId, quantity: 50000 }),
    { headers },
  );
  check(stockRes, { 'setup: stock seeded → 201': (r) => r.status === 201 });

  return { token, productId };
}

// ── Default: full order lifecycle with concurrency pressure ────────────────
export default function (data) {
  const { token, productId } = data;
  const headers = authHeaders(token);

  // ── GROUP 1: Read order list (read under heavy write pressure)
  group('GET /orders (list under write stress)', () => {
    const res = http.get(`${BASE_URL}/orders?page=1&limit=10`, { headers });
    listDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 200':   (r) => r.status === 200,
      'has data array':  (r) => Array.isArray(r.json('data')),
      'latency < 800ms': (r) => r.timings.duration < 800,
    });
    orderErrorRate.add(!ok && res.status >= 500);
  });

  sleep(0.1);

  // ── GROUP 2: Create order (pending) — concurrent INSERT flood
  let orderId = null;
  group('POST /orders (create — INSERT flood)', () => {
    const qty = Math.floor(Math.random() * 3) + 1; // 1–3 units per order
    const res = http.post(
      `${BASE_URL}/orders`,
      JSON.stringify({
        type:  'sales',
        items: [{ productId, quantity: qty }],
        notes: `Stress order VU${__VU} Iter${__ITER}`,
      }),
      { headers },
    );
    createDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 201':    (r) => r.status === 201,
      'has id':           (r) => typeof r.json('id') === 'string',
      'status pending':   (r) => r.json('status') === 'pending',
      'latency < 1500ms': (r) => r.timings.duration < 1500,
    });

    if (ok) {
      orderId = res.json('id');
      ordersCreated.add(1);
    }
    orderErrorRate.add(!ok && res.status >= 500);
  });

  sleep(0.1);

  if (!orderId) return; // Skip remaining groups if order creation failed

  // ── GROUP 3: Confirm order (atomic: state change + inventory deduction)
  // This is the most expensive operation — cross-table transaction
  group('POST /orders/:id/confirm (cross-table transaction stress)', () => {
    const res = http.post(
      `${BASE_URL}/orders/${orderId}/confirm`,
      null,
      { headers },
    );
    confirmDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 200':     (r) => r.status === 200,
      'status confirmed':  (r) => r.json('status') === 'confirmed',
      'latency < 2000ms':  (r) => r.timings.duration < 2000,
    });

    if (ok) ordersConfirmed.add(1);
    orderErrorRate.add(!ok && res.status >= 500);
  });

  sleep(0.1);

  // ── GROUP 4: Fulfill order — only every 2nd iteration
  if (__ITER % 2 === 0) {
    group('POST /orders/:id/fulfill (state transition)', () => {
      const res = http.post(
        `${BASE_URL}/orders/${orderId}/fulfill`,
        null,
        { headers },
      );
      fulfillDuration.add(res.timings.duration);

      const ok = check(res, {
        'status is 200':    (r) => r.status === 200,
        'status fulfilled': (r) => r.json('status') === 'fulfilled',
        'latency < 1000ms': (r) => r.timings.duration < 1000,
      });

      if (ok) ordersFulfilled.add(1);
      orderErrorRate.add(!ok && res.status >= 500);
    });
  }

  sleep(0.2);
}
