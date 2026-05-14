/**
 * FILE: k6/stress-all.js
 * PURPOSE: Run ALL module stress tests as one combined full-system stress suite.
 *
 * WHEN TO USE:
 *   - Before a major release (find breaking points early)
 *   - After scaling infrastructure (verify new capacity)
 *   - When you suspect a performance regression
 *   - Monthly capacity planning exercises
 *
 * WHAT THIS TESTS:
 *   All modules run concurrently under stress load — simulating real-world
 *   mixed traffic: users logging in WHILE products are queried WHILE
 *   inventory stock operations run WHILE orders are being created.
 *
 *   This is harder to survive than single-module stress because the DB
 *   connection pool is shared across all operations simultaneously.
 *
 * HOW TO RUN:
 *   k6 run k6/stress-all.js
 *   k6 run --out json=k6/reports/stress-all.json k6/stress-all.js
 *   k6 run --out csv=k6/reports/stress-all.csv k6/stress-all.js
 *
 * EXPECTED DURATION: ~5-6 minutes
 * EXPECTED PEAK VUs: 70 × 4 modules = 280 concurrent VUs total
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { BASE_URL } from './setup/config.js';
import {
  JSON_HEADERS,
  authHeaders,
  uniqueEmail,
  uniqueSku,
  registerAndLogin,
} from './setup/helpers.js';
import {
  STRESS_THRESHOLDS,
} from './setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const authLoginDuration      = new Trend('auth_login_duration', true);
const authRegisterDuration   = new Trend('auth_register_duration', true);
const productsListDuration   = new Trend('products_get_list_duration', true);
const productsCreateDuration = new Trend('products_create_duration', true);
const inventoryGetDuration   = new Trend('inventory_get_stock_duration', true);
const inventoryInDuration    = new Trend('inventory_stock_in_duration', true);
const inventoryOutDuration   = new Trend('inventory_stock_out_duration', true);
const ordersCreateDuration   = new Trend('orders_create_duration', true);
const ordersConfirmDuration  = new Trend('orders_confirm_duration', true);

const authLoginSuccess       = new Counter('auth_login_success');
const inventoryStockOutOk    = new Counter('inventory_stock_out_success');
const inventoryStockOutFail  = new Counter('inventory_stock_out_insufficient');
const ordersCreated          = new Counter('orders_created');
const ordersConfirmed        = new Counter('orders_confirmed');
const productsErrorRate      = new Rate('products_error_rate');
const inventoryTxErrorRate   = new Rate('inventory_transaction_error_rate');
const ordersErrorRate        = new Rate('orders_error_rate');

// ── Shared stress ramp profile ────────────────────────────────────────────
// Each module scenario uses this same ramp shape but independently
const STRESS_STAGES = [
  { duration: '30s', target: 10 },
  { duration: '30s', target: 30 },
  { duration: '1m',  target: 50 },
  { duration: '30s', target: 70 },
  { duration: '1m',  target: 70 },
  { duration: '30s', target: 10 },
  { duration: '20s', target: 0  },
];

// ── Stress Suite Options ──────────────────────────────────────────────────
export const options = {
  scenarios: {
    auth_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages:   STRESS_STAGES,
      exec:     'authStress',
    },
    products_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages:   STRESS_STAGES,
      exec:     'productsStress',
    },
    inventory_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages:   STRESS_STAGES,
      exec:     'inventoryStress',
    },
    orders_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages:   STRESS_STAGES,
      exec:     'ordersStress',
    },
  },
  thresholds: {
    // Only built-in k6 metrics are safe for suite-level thresholds.
    // Custom metrics are registered per exec function — use per-module
    // stress scripts (k6/stress/*.stress.js) to assert module-specific SLAs.
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed:   ['rate<0.10'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Shared Setup: create all seed data once before all VUs start ──────────
export function setup() {
  const token   = registerAndLogin('stress_suite');
  const headers = authHeaders(token);

  // Shared login user for auth stress
  const authEmail    = `stress_login_${Date.now()}@warehouse.com`;
  const authPassword = 'Stress@1234';
  http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email: authEmail, firstName: 'Stress', lastName: 'Login', password: authPassword }),
    { headers: JSON_HEADERS },
  );

  // Seed product for inventory race condition test
  const invProduct = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({ sku: `STRESS-INV-${Date.now()}`, name: 'Stress Inv Product', price: 5, quantity: 0, unit: 'pcs' }),
    { headers },
  );
  const invProductId = invProduct.json('id');
  http.post(`${BASE_URL}/inventory/stock-in`, JSON.stringify({ productId: invProductId, quantity: 50000 }), { headers });

  // Seed product for orders stress
  const ordProduct = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({ sku: `STRESS-ORD-${Date.now()}`, name: 'Stress Order Product', price: 15, quantity: 0, unit: 'pcs' }),
    { headers },
  );
  const ordProductId = ordProduct.json('id');
  http.post(`${BASE_URL}/inventory/stock-in`, JSON.stringify({ productId: ordProductId, quantity: 100000 }), { headers });

  return { token, authEmail, authPassword, invProductId, ordProductId };
}

// ── AUTH STRESS ────────────────────────────────────────────────────────────
export function authStress(data) {
  const { authEmail, authPassword } = data;

  // Concurrent login — bcrypt CPU saturation test
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: authEmail, password: authPassword }),
    { headers: JSON_HEADERS },
  );
  authLoginDuration.add(loginRes.timings.duration);
  const ok = check(loginRes, {
    '[AUTH STRESS] login → 200': (r) => r.status === 200,
    '[AUTH STRESS] has token':   (r) => typeof r.json('accessToken') === 'string',
  });
  authLoginSuccess.add(ok ? 1 : 0);

  sleep(0.1);

  // Register new users every 5th iteration
  if (__ITER % 5 === 0) {
    const regRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({ email: uniqueEmail(), firstName: 'S', lastName: 'T', password: 'Stress@1234' }),
      { headers: JSON_HEADERS },
    );
    authRegisterDuration.add(regRes.timings.duration);
    check(regRes, { '[AUTH STRESS] register → 201': (r) => r.status === 201 });
  }

  sleep(0.1);
}

// ── PRODUCTS STRESS ────────────────────────────────────────────────────────
export function productsStress(data) {
  const headers = authHeaders(data.token);
  const page = (__VU % 5) + 1;

  const listRes = http.get(`${BASE_URL}/products?page=${page}&limit=20`, { headers });
  productsListDuration.add(listRes.timings.duration);
  const listOk = check(listRes, {
    '[PRODUCTS STRESS] list → 200': (r) => r.status === 200,
    '[PRODUCTS STRESS] lat<800ms':  (r) => r.timings.duration < 800,
  });
  productsErrorRate.add(!listOk && listRes.status >= 500);

  sleep(0.1);

  if (__ITER % 5 === 0) {
    const createRes = http.post(
      `${BASE_URL}/products`,
      JSON.stringify({ sku: uniqueSku(), name: `Stress VU${__VU}`, price: 9.99, quantity: 0, unit: 'pcs' }),
      { headers },
    );
    productsCreateDuration.add(createRes.timings.duration);
    const createOk = check(createRes, { '[PRODUCTS STRESS] create → 201': (r) => r.status === 201 });
    productsErrorRate.add(!createOk && createRes.status >= 500);
  }

  sleep(0.2);
}

// ── INVENTORY STRESS ───────────────────────────────────────────────────────
export function inventoryStress(data) {
  const { token, invProductId } = data;
  const headers = authHeaders(token);

  // Read stock (should be fast even under write contention)
  const getRes = http.get(`${BASE_URL}/inventory/stocks/${invProductId}`, { headers });
  inventoryGetDuration.add(getRes.timings.duration);
  check(getRes, {
    '[INV STRESS] get stock → 200': (r) => r.status === 200,
    '[INV STRESS] qty >= 0':        (r) => r.json('quantity') >= 0,
  });

  sleep(0.05);

  // Concurrent stock-out: race condition test
  const outRes = http.post(
    `${BASE_URL}/inventory/stock-out`,
    JSON.stringify({ productId: invProductId, quantity: Math.floor(Math.random() * 5) + 1 }),
    { headers },
  );
  inventoryOutDuration.add(outRes.timings.duration);
  if (outRes.status === 201) {
    inventoryStockOutOk.add(1);
  } else if (outRes.status === 400) {
    inventoryStockOutFail.add(1);
  } else {
    inventoryTxErrorRate.add(1);
  }

  sleep(0.05);

  // Periodic stock-in to keep stock topped up for continued test
  if (__ITER % 20 === 0) {
    const inRes = http.post(
      `${BASE_URL}/inventory/stock-in`,
      JSON.stringify({ productId: invProductId, quantity: 5000 }),
      { headers },
    );
    inventoryInDuration.add(inRes.timings.duration);
    check(inRes, { '[INV STRESS] stock-in → 201': (r) => r.status === 201 });
  }

  sleep(0.1);
}

// ── ORDERS STRESS ──────────────────────────────────────────────────────────
export function ordersStress(data) {
  const { token, ordProductId } = data;
  const headers = authHeaders(token);

  let orderId = null;

  // Create order
  const createRes = http.post(
    `${BASE_URL}/orders`,
    JSON.stringify({ items: [{ productId: ordProductId, quantity: 1 }], notes: `Stress VU${__VU}` }),
    { headers },
  );
  ordersCreateDuration.add(createRes.timings.duration);
  const createOk = check(createRes, {
    '[ORDERS STRESS] create → 201':  (r) => r.status === 201,
    '[ORDERS STRESS] status PENDING': (r) => r.json('status') === 'PENDING',
  });
  if (createOk) {
    orderId = createRes.json('id');
    ordersCreated.add(1);
  }
  ordersErrorRate.add(!createOk && createRes.status >= 500);

  if (!orderId) { sleep(0.2); return; }

  sleep(0.1);

  // Confirm order (cross-table atomic transaction)
  const confirmRes = http.post(`${BASE_URL}/orders/${orderId}/confirm`, null, { headers });
  ordersConfirmDuration.add(confirmRes.timings.duration);
  const confirmOk = check(confirmRes, {
    '[ORDERS STRESS] confirm → 200':    (r) => r.status === 200,
    '[ORDERS STRESS] status CONFIRMED': (r) => r.json('status') === 'CONFIRMED',
  });
  if (confirmOk) ordersConfirmed.add(1);
  ordersErrorRate.add(!confirmOk && confirmRes.status >= 500);

  sleep(0.2);
}
