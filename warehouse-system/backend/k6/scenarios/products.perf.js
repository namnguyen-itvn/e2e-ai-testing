/**
 * FILE: k6/scenarios/products.perf.js
 * PURPOSE: Performance test for Product CRUD operations.
 *
 * WHAT WE MEASURE:
 * - Read-heavy workload (GET list, GET by ID) — typical 80/20 read/write ratio
 * - Write throughput (POST, PATCH)
 * - Pagination performance at scale
 * - Response time degradation as data grows
 *
 * REAL-WORLD INSIGHT:
 * Most warehouse dashboards are read-heavy. This test verifies
 * that GET /products responds fast even under concurrent load.
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, getScenario } from '../setup/config.js';
import { authHeaders, JSON_HEADERS, uniqueSku, registerAndLogin, assertStatus } from '../setup/helpers.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const getListDuration   = new Trend('products_get_list_duration', true);
const getOneDuration    = new Trend('products_get_one_duration', true);
const createDuration    = new Trend('products_create_duration', true);
const updateDuration    = new Trend('products_update_duration', true);
const errorRate         = new Rate('products_error_rate');

// ── Options ───────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    products_load: getScenario(),
  },
  thresholds: {
    ...THRESHOLDS,
    'products_get_list_duration': ['p(95)<300'],  // List queries must be fast
    'products_get_one_duration':  ['p(95)<200'],  // Point queries even faster
    'products_create_duration':   ['p(95)<500'],  // Writes can be slightly slower
    'products_error_rate':        ['rate<0.01'],  // < 1% errors
  },
};

// ── Setup: authenticate once ───────────────────────────────────────────────
export function setup() {
  const token = registerAndLogin('products');
  return { token };
}

// ── Default: simulate realistic read/write mix ─────────────────────────────
export default function (data) {
  const { token } = data;
  const headers = authHeaders(token);

  // ── READ: GET paginated product list (80% of traffic)
  {
    const page = Math.floor(Math.random() * 3) + 1; // pages 1-3
    const res = http.get(`${BASE_URL}/products?page=${page}&limit=20`, { headers });
    getListDuration.add(res.timings.duration);

    const ok = check(res, {
      'GET /products: status 200': (r) => r.status === 200,
      'GET /products: has data array': (r) => Array.isArray(r.json('data')),
      'GET /products: has total': (r) => typeof r.json('total') === 'number',
    });
    errorRate.add(!ok);
    sleep(0.3);
  }

  // ── WRITE: CREATE a product (10% of traffic — every 10th iteration)
  let createdProductId = null;
  if (__ITER % 10 === 0) {
    const sku = uniqueSku();
    const res = http.post(
      `${BASE_URL}/products`,
      JSON.stringify({
        sku,
        name: `Perf Product VU${__VU} Iter${__ITER}`,
        price: Math.round(Math.random() * 1000) + 1,
        quantity: Math.floor(Math.random() * 100),
        unit: 'pcs',
        category: 'Performance Test',
      }),
      { headers },
    );
    createDuration.add(res.timings.duration);

    const ok = assertStatus(res, 201, 'POST /products');
    errorRate.add(!ok);

    if (ok) {
      createdProductId = res.json('id');
    }
    sleep(0.2);
  }

  // ── READ: GET single product by ID (if we just created one)
  if (createdProductId) {
    const res = http.get(`${BASE_URL}/products/${createdProductId}`, { headers });
    getOneDuration.add(res.timings.duration);

    check(res, {
      'GET /products/:id: status 200': (r) => r.status === 200,
      'GET /products/:id: correct id': (r) => r.json('id') === createdProductId,
    });

    // ── UPDATE: PATCH the product we just created
    const patchRes = http.patch(
      `${BASE_URL}/products/${createdProductId}`,
      JSON.stringify({ name: `Updated by VU${__VU}` }),
      { headers },
    );
    updateDuration.add(patchRes.timings.duration);
    assertStatus(patchRes, 200, 'PATCH /products/:id');
    sleep(0.2);
  }

  // ── READ: GET by non-existent ID (test 404 performance)
  {
    const res = http.get(
      `${BASE_URL}/products/00000000-0000-0000-0000-000000000000`,
      { headers },
    );
    check(res, { 'GET non-existent: status 404': (r) => r.status === 404 });
  }

  sleep(1);
}
