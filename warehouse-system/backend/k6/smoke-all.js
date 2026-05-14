/**
 * FILE: k6/smoke-all.js
 * PURPOSE: Run ALL module smoke tests as one combined suite.
 *
 * WHEN TO USE:
 *   - After every deployment (< 1 minute CI/CD gate)
 *   - Before running heavier tests (confirm server is alive)
 *   - Whenever you want a quick system health check
 *
 * HOW IT WORKS:
 *   k6 scenarios run concurrently. Each module has its own VU pool.
 *   setup() runs once and shares data (auth token, seed IDs) across all.
 *
 * HOW TO RUN:
 *   k6 run k6/smoke-all.js
 *   k6 run --out json=k6/reports/smoke-all.json k6/smoke-all.js
 *
 * EXPECTED DURATION: ~30-45 seconds
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL } from './setup/config.js';
import {
  JSON_HEADERS,
  authHeaders,
  uniqueEmail,
  uniqueSku,
  registerAndLogin,
} from './setup/helpers.js';
import {
  SMOKE_THRESHOLDS,
} from './setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const authLoginDuration     = new Trend('auth_login_duration', true);
const productsListDuration  = new Trend('products_get_list_duration', true);
const productsCreateDuration = new Trend('products_create_duration', true);
const inventoryGetDuration  = new Trend('inventory_get_stock_duration', true);
const inventoryInDuration   = new Trend('inventory_stock_in_duration', true);
const ordersCreateDuration  = new Trend('orders_create_duration', true);
const ordersConfirmDuration = new Trend('orders_confirm_duration', true);

// ── Smoke Suite Options ───────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Each module runs independently in its own VU "lane"
    auth_smoke: {
      executor:  'ramping-vus',
      startVUs:  1,
      stages: [
        { duration: '15s', target: 1 },
        { duration: '5s',  target: 0 },
      ],
      exec: 'authSmoke',
    },
    products_smoke: {
      executor:  'ramping-vus',
      startVUs:  1,
      stages: [
        { duration: '20s', target: 1 },
        { duration: '5s',  target: 0 },
      ],
      exec: 'productsSmoke',
    },
    inventory_smoke: {
      executor:  'ramping-vus',
      startVUs:  1,
      stages: [
        { duration: '20s', target: 1 },
        { duration: '5s',  target: 0 },
      ],
      exec: 'inventorySmoke',
    },
    orders_smoke: {
      executor:  'ramping-vus',
      startVUs:  1,
      stages: [
        { duration: '25s', target: 1 },
        { duration: '5s',  target: 0 },
      ],
      exec: 'ordersSmoke',
    },
  },
  thresholds: {
    // Only built-in k6 metrics are guaranteed to exist across all scenarios.
    // Custom Trend/Counter metrics (auth_login_duration, etc.) are defined
    // per-scenario exec function — use per-module smoke scripts for those.
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Shared Setup: runs ONCE before all VU scenarios start ─────────────────
export function setup() {
  const token   = registerAndLogin('smoke_suite');
  const headers = authHeaders(token);

  // Create seed product for inventory + order scenarios
  const productRes = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      sku:      `SMOKE-SUITE-${Date.now()}`,
      name:     'Smoke Suite Seed Product',
      price:    20,
      quantity: 0,
      unit:     'pcs',
    }),
    { headers },
  );
  check(productRes, { 'suite setup: product created → 201': (r) => r.status === 201 });
  const productId = productRes.json('id');

  // Seed inventory
  http.post(
    `${BASE_URL}/inventory/stock-in`,
    JSON.stringify({ productId, quantity: 500 }),
    { headers },
  );

  // Pre-create a shared user for auth login tests
  const authEmail    = `smoke_login_${Date.now()}@warehouse.com`;
  const authPassword = 'Smoke@1234';
  http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      email: authEmail, firstName: 'Smoke', lastName: 'Login', password: authPassword,
    }),
    { headers: JSON_HEADERS },
  );

  return { token, productId, authEmail, authPassword };
}

// ── AUTH SMOKE ─────────────────────────────────────────────────────────────
export function authSmoke(data) {
  const { authEmail, authPassword } = data;

  group('Auth Smoke — Login', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: authEmail, password: authPassword }),
      { headers: JSON_HEADERS },
    );
    authLoginDuration.add(res.timings.duration);
    check(res, {
      '[AUTH] login → 200':      (r) => r.status === 200,
      '[AUTH] has accessToken':  (r) => typeof r.json('accessToken') === 'string',
    });
  });

  group('Auth Smoke — Invalid Login → 401', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: authEmail, password: 'WrongPass' }),
      { headers: JSON_HEADERS },
    );
    check(res, { '[AUTH] bad creds → 401': (r) => r.status === 401 });
  });

  sleep(1);
}

// ── PRODUCTS SMOKE ─────────────────────────────────────────────────────────
export function productsSmoke(data) {
  const headers = authHeaders(data.token);

  group('Products Smoke — List', () => {
    const res = http.get(`${BASE_URL}/products?page=1&limit=10`, { headers });
    productsListDuration.add(res.timings.duration);
    check(res, {
      '[PRODUCTS] list → 200':      (r) => r.status === 200,
      '[PRODUCTS] has data array':  (r) => Array.isArray(r.json('data')),
    });
  });

  sleep(0.3);

  let newId = null;
  group('Products Smoke — Create', () => {
    const res = http.post(
      `${BASE_URL}/products`,
      JSON.stringify({ sku: uniqueSku(), name: 'Smoke Suite Product', price: 9.99, quantity: 0, unit: 'pcs' }),
      { headers },
    );
    productsCreateDuration.add(res.timings.duration);
    check(res, {
      '[PRODUCTS] create → 201': (r) => r.status === 201,
      '[PRODUCTS] has id':       (r) => typeof r.json('id') === 'string',
    });
    if (res.status === 201) newId = res.json('id');
  });

  if (newId) {
    sleep(0.3);
    group('Products Smoke — Get By ID', () => {
      const res = http.get(`${BASE_URL}/products/${newId}`, { headers });
      check(res, { '[PRODUCTS] get by id → 200': (r) => r.status === 200 });
    });
  }

  sleep(1);
}

// ── INVENTORY SMOKE ────────────────────────────────────────────────────────
export function inventorySmoke(data) {
  const { token, productId } = data;
  const headers = authHeaders(token);

  group('Inventory Smoke — Get Stock', () => {
    const res = http.get(`${BASE_URL}/inventory/stocks/${productId}`, { headers });
    inventoryGetDuration.add(res.timings.duration);
    check(res, {
      '[INVENTORY] get stock → 200':       (r) => r.status === 200,
      '[INVENTORY] quantity is a number':  (r) => typeof r.json('currentQuantity') === 'number',
      '[INVENTORY] no negative stock':     (r) => r.json('currentQuantity') >= 0,
    });
  });

  sleep(0.3);

  group('Inventory Smoke — Stock In', () => {
    const res = http.post(
      `${BASE_URL}/inventory/stock-in`,
      JSON.stringify({ productId, quantity: 10 }),
      { headers },
    );
    inventoryInDuration.add(res.timings.duration);
    check(res, { '[INVENTORY] stock-in → 201': (r) => r.status === 201 });
  });

  sleep(0.3);

  group('Inventory Smoke — Stock Out (insufficient → 400)', () => {
    const res = http.post(
      `${BASE_URL}/inventory/stock-out`,
      JSON.stringify({ productId, quantity: 9_999_999 }),
      { headers },
    );
    check(res, { '[INVENTORY] insufficient stock → 400': (r) => r.status === 400 });
  });

  sleep(1);
}

// ── ORDERS SMOKE ───────────────────────────────────────────────────────────
export function ordersSmoke(data) {
  const { token, productId } = data;
  const headers = authHeaders(token);

  group('Orders Smoke — List', () => {
    const res = http.get(`${BASE_URL}/orders?page=1&limit=5`, { headers });
    check(res, {
      '[ORDERS] list → 200':     (r) => r.status === 200,
      '[ORDERS] has data array': (r) => Array.isArray(r.json('data')),
    });
  });

  sleep(0.3);

  let orderId = null;
  group('Orders Smoke — Create (PENDING)', () => {
    const res = http.post(
      `${BASE_URL}/orders`,
      JSON.stringify({ type: 'sales', items: [{ productId, quantity: 1 }], notes: 'Smoke suite order' }),
      { headers },
    );
    ordersCreateDuration.add(res.timings.duration);
    check(res, {
      '[ORDERS] create → 201':   (r) => r.status === 201,
      '[ORDERS] status pending': (r) => r.json('status') === 'pending',
    });
    if (res.status === 201) orderId = res.json('id');
  });

  if (!orderId) return;
  sleep(0.3);

  group('Orders Smoke — Confirm (confirmed)', () => {
    const res = http.post(`${BASE_URL}/orders/${orderId}/confirm`, null, { headers });
    ordersConfirmDuration.add(res.timings.duration);
    check(res, {
      '[ORDERS] confirm → 200':    (r) => r.status === 200,
      '[ORDERS] status confirmed': (r) => r.json('status') === 'confirmed',
    });
  });

  sleep(0.3);

  group('Orders Smoke — Fulfill (fulfilled)', () => {
    const res = http.post(`${BASE_URL}/orders/${orderId}/fulfill`, null, { headers });
    check(res, {
      '[ORDERS] fulfill → 200':    (r) => r.status === 200,
      '[ORDERS] status fulfilled': (r) => r.json('status') === 'fulfilled',
    });
  });

  sleep(1);
}
