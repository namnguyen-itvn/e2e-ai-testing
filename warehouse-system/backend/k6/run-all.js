/**
 * FILE: k6/run-all.js
 * PURPOSE: Run all scenarios in sequence as a full system performance suite.
 *
 * USAGE:
 * k6 run k6/run-all.js                         → load test (default)
 * k6 run k6/run-all.js -e TEST_TYPE=smoke       → quick smoke test
 * k6 run k6/run-all.js -e TEST_TYPE=stress      → stress test
 * k6 run k6/run-all.js -e TEST_TYPE=spike       → spike test
 * k6 run --out json=k6/reports/results.json k6/run-all.js → export JSON report
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { BASE_URL, THRESHOLDS, getScenario } from './setup/config.js';
import { authHeaders, JSON_HEADERS, registerAndLogin, uniqueSku } from './setup/helpers.js';

export const options = {
  scenarios: {
    // All modules tested concurrently to simulate real mixed traffic
    auth_scenario:      { ...getScenario(), exec: 'authFlow'      },
    products_scenario:  { ...getScenario(), exec: 'productsFlow'  },
    inventory_scenario: { ...getScenario(), exec: 'inventoryFlow' },
    orders_scenario:    { ...getScenario(), exec: 'ordersFlow'    },
  },
  thresholds: THRESHOLDS,

  // Output summary to console in a human-readable format
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Shared Setup ───────────────────────────────────────────────────────────
export function setup() {
  const token = registerAndLogin('master');
  const headers = authHeaders(token);

  // Create product for inventory + order tests
  const productRes = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      sku: `MASTER-${Date.now()}`,
      name: 'Master Perf Product',
      price: 50,
      quantity: 0,
      unit: 'pcs',
    }),
    { headers },
  );
  const productId = productRes.json('id');

  // Pre-load massive stock
  http.post(
    `${BASE_URL}/inventory/stock-in`,
    JSON.stringify({ productId, quantity: 999999 }),
    { headers },
  );

  return { token, productId };
}

// ── Auth Flow ──────────────────────────────────────────────────────────────
export function authFlow(data) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'nonexistent@test.com', password: 'wrong' }),
    { headers: JSON_HEADERS },
  );
  check(res, { 'auth: 401 on bad creds': (r) => r.status === 401 });
  sleep(1);
}

// ── Products Flow ──────────────────────────────────────────────────────────
export function productsFlow(data) {
  const headers = authHeaders(data.token);
  const res = http.get(`${BASE_URL}/products?page=1&limit=10`, { headers });
  check(res, {
    'products: status 200': (r) => r.status === 200,
    'products: response < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(0.5);
}

// ── Inventory Flow ─────────────────────────────────────────────────────────
export function inventoryFlow(data) {
  const headers = authHeaders(data.token);
  const res = http.post(
    `${BASE_URL}/inventory/stock-out`,
    JSON.stringify({ productId: data.productId, quantity: 1 }),
    { headers },
  );
  check(res, {
    'inventory: 201 or 400': (r) => r.status === 201 || r.status === 400,
    'inventory: stock never negative': (r) =>
      r.status !== 201 || r.json('quantityAfter') >= 0,
  });
  sleep(0.5);
}

// ── Orders Flow ────────────────────────────────────────────────────────────
export function ordersFlow(data) {
  const headers = authHeaders(data.token);

  // Create order
  const res = http.post(
    `${BASE_URL}/orders`,
    JSON.stringify({
      type: 'sales',
      items: [{ productId: data.productId, quantity: 1 }],
    }),
    { headers },
  );

  if (res.status === 201) {
    const orderId = res.json('id');
    // Confirm
    http.post(`${BASE_URL}/orders/${orderId}/confirm`, null, { headers });
  }

  check(res, { 'orders: created or conflict': (r) => r.status === 201 });
  sleep(1);
}
