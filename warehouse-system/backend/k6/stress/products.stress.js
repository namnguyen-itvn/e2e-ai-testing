/**
 * FILE: k6/stress/products.stress.js
 * PURPOSE: Stress test for Products CRUD under high concurrency.
 *
 * STRESS SCENARIOS:
 * ─────────────────────────────────────────────────────────────
 * 1. READ FLOOD: 50-70 VUs hammering GET /products simultaneously.
 *    Goal: verify query performance, DB connection pool behavior.
 *    Expected: p95 rises but stays under 800ms.
 *
 * 2. WRITE STORM: Concurrent POST /products (unique SKU per VU).
 *    Goal: verify no DB deadlocks, no UniqueConstraint violations,
 *    correct auto-increment/UUID generation under concurrency.
 *
 * 3. MIXED LOAD (realistic): 80% reads / 20% writes — matches prod.
 *    This is how most warehouse dashboards actually behave.
 *
 * WHAT TO WATCH FOR:
 *   - DB connection pool exhaustion (error: "too many clients")
 *   - Query timeout errors
 *   - Response time cliff (sudden jump at a specific VU count)
 *
 * HOW TO RUN:
 *   k6 run k6/stress/products.stress.js
 *   k6 run --out json=k6/reports/products-stress.json k6/stress/products.stress.js
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL } from '../setup/config.js';
import { authHeaders, uniqueSku, registerAndLogin } from '../setup/helpers.js';
import { getThresholds } from '../setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const listDuration   = new Trend('products_get_list_duration', true);
const getDuration    = new Trend('products_get_one_duration', true);
const createDuration = new Trend('products_create_duration', true);
const updateDuration = new Trend('products_update_duration', true);
const errorRate      = new Rate('products_error_rate');
const createCount    = new Counter('products_created_total');

// ── Stress Options ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },  // Warm-up
        { duration: '30s', target: 30 },  // Normal load (baseline)
        { duration: '1m',  target: 50 },  // Stress: 5× normal
        { duration: '30s', target: 70 },  // Push to limit
        { duration: '1m',  target: 70 },  // Sustain — look for degradation
        { duration: '30s', target: 10 },  // Recovery ramp-down
        { duration: '20s', target: 0  },
      ],
    },
  },
  thresholds: getThresholds('products', 'stress'),
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Setup ─────────────────────────────────────────────────────────────────
export function setup() {
  const token = registerAndLogin('products_stress');

  // Pre-create a product for GET-by-ID and PATCH tests
  const headers = authHeaders(token);
  const res = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      sku:      `STRESS-SEED-${Date.now()}`,
      name:     'Stress Seed Product',
      price:    19.99,
      quantity: 1000,
      unit:     'pcs',
    }),
    { headers },
  );
  const seedProductId = res.json('id');

  return { token, seedProductId };
}

// ── Default: realistic 80/20 read/write mix under stress ──────────────────
export default function (data) {
  const { token, seedProductId } = data;
  const headers = authHeaders(token);

  // ── GROUP 1: Read-heavy — GET paginated list (most common operation)
  group('GET /products (paginated — read flood)', () => {
    // Spread load across pages to simulate real usage patterns
    const page = (__VU % 5) + 1; // VUs cycle through pages 1-5
    const res = http.get(`${BASE_URL}/products?page=${page}&limit=20`, { headers });
    listDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 200':       (r) => r.status === 200,
      'has data array':      (r) => Array.isArray(r.json('data')),
      'latency < 800ms':     (r) => r.timings.duration < 800,
    });
    errorRate.add(!ok);
  });

  sleep(0.1); // Minimal sleep — stress test, not load test

  // ── GROUP 2: Point read — GET by ID
  if (seedProductId) {
    group('GET /products/:id (point read)', () => {
      const res = http.get(`${BASE_URL}/products/${seedProductId}`, { headers });
      getDuration.add(res.timings.duration);

      const ok = check(res, {
        'status is 200':   (r) => r.status === 200,
        'id matches':      (r) => r.json('id') === seedProductId,
        'latency < 600ms': (r) => r.timings.duration < 600,
      });
      errorRate.add(!ok);
    });
  }

  sleep(0.1);

  // ── GROUP 3: WRITE — Create product (every 5th iteration → 20% writes)
  // Each VU generates a unique SKU to avoid UniqueConstraint conflicts
  if (__ITER % 5 === 0) {
    let newProductId = null;

    group('POST /products (create — write storm)', () => {
      const sku = uniqueSku();
      const res = http.post(
        `${BASE_URL}/products`,
        JSON.stringify({
          sku,
          name:     `Stress VU${__VU} Iter${__ITER}`,
          price:    Math.round(Math.random() * 500) + 1,
          quantity: Math.floor(Math.random() * 200),
          unit:     'pcs',
        }),
        { headers },
      );
      createDuration.add(res.timings.duration);

      const ok = check(res, {
        'status is 201':    (r) => r.status === 201,
        'has id':           (r) => typeof r.json('id') === 'string',
        'latency < 1000ms': (r) => r.timings.duration < 1000,
      });
      if (ok) {
        newProductId = res.json('id');
        createCount.add(1);
      }
      errorRate.add(!ok);
    });

    // ── GROUP 4: Immediately update the product just created (write-after-write)
    if (newProductId) {
      group('PATCH /products/:id (update — write-after-write)', () => {
        const res = http.patch(
          `${BASE_URL}/products/${newProductId}`,
          JSON.stringify({ price: 999.99 }),
          { headers },
        );
        updateDuration.add(res.timings.duration);

        const ok = check(res, {
          'status is 200':    (r) => r.status === 200,
          'latency < 1000ms': (r) => r.timings.duration < 1000,
        });
        errorRate.add(!ok);
      });
    }
  }

  sleep(0.2);
}
