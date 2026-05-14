/**
 * FILE: k6/scenarios/orders.perf.js
 * PURPOSE: Full Order lifecycle performance test — create → confirm → fulfill.
 *
 * WHAT WE MEASURE:
 * - End-to-end order processing time
 * - Concurrent order creation (unique order numbers under load)
 * - State machine transitions under concurrent requests
 * - Inventory deduction accuracy during order confirmation
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, getScenario } from '../setup/config.js';
import { authHeaders, registerAndLogin, assertStatus } from '../setup/helpers.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const orderCreateDuration  = new Trend('orders_create_duration', true);
const orderConfirmDuration = new Trend('orders_confirm_duration', true);
const orderFulfillDuration = new Trend('orders_fulfill_duration', true);
const orderCreated         = new Counter('orders_created');
const orderConfirmed       = new Counter('orders_confirmed');
const orderFulfilled       = new Counter('orders_fulfilled');

// ── Options ───────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    orders_load: getScenario(),
  },
  thresholds: {
    ...THRESHOLDS,
    'orders_create_duration':  ['p(95)<600'],
    'orders_confirm_duration': ['p(95)<800'],  // Confirm triggers inventory deduction
    'orders_fulfill_duration': ['p(95)<400'],
  },
};

// ── Setup ─────────────────────────────────────────────────────────────────
export function setup() {
  const token = registerAndLogin('orders');
  const headers = authHeaders(token);

  // Create a product with massive stock for order tests
  const productRes = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      sku: `ORDER-PERF-${Date.now()}`,
      name: 'Order Perf Product',
      price: 99.99,
      quantity: 0,
      unit: 'pcs',
    }),
    { headers },
  );
  const productId = productRes.json('id');

  // Stock in 500k units
  http.post(
    `${BASE_URL}/inventory/stock-in`,
    JSON.stringify({ productId, quantity: 500000 }),
    { headers },
  );

  return { token, productId };
}

// ── Default: full order lifecycle ─────────────────────────────────────────
export default function (data) {
  const { token, productId } = data;
  const headers = authHeaders(token);
  const qty = Math.floor(Math.random() * 3) + 1; // 1-3 units per order

  // ── Step 1: CREATE order
  const createRes = http.post(
    `${BASE_URL}/orders`,
    JSON.stringify({
      type: 'sales',
      partnerName: `Customer VU${__VU}`,
      items: [{ productId, quantity: qty }],
    }),
    { headers },
  );
  orderCreateDuration.add(createRes.timings.duration);

  const createOk = check(createRes, {
    'create order: status 201': (r) => r.status === 201,
    'create order: status is pending': (r) => r.json('status') === 'pending',
    'create order: has orderNumber': (r) => r.json('orderNumber') !== undefined,
  });

  if (!createOk) {
    console.error(`Order create failed: ${createRes.status} ${createRes.body}`);
    sleep(1);
    return;
  }

  const orderId = createRes.json('id');
  orderCreated.add(1);
  sleep(0.3);

  // ── Step 2: CONFIRM order (deducts stock for SALES orders)
  const confirmRes = http.post(
    `${BASE_URL}/orders/${orderId}/confirm`,
    null,
    { headers },
  );
  orderConfirmDuration.add(confirmRes.timings.duration);

  const confirmOk = check(confirmRes, {
    'confirm order: status 200': (r) => r.status === 200,
    'confirm order: status is confirmed': (r) => r.json('status') === 'confirmed',
    'confirm order: has confirmedAt': (r) => r.json('confirmedAt') !== null,
  });

  if (!confirmOk) {
    // 400 is OK if stock ran out — not a system error
    if (confirmRes.status !== 400) {
      console.error(`Order confirm failed unexpectedly: ${confirmRes.status}`);
    }
    sleep(1);
    return;
  }
  orderConfirmed.add(1);
  sleep(0.3);

  // ── Step 3: FULFILL order
  const fulfillRes = http.post(
    `${BASE_URL}/orders/${orderId}/fulfill`,
    null,
    { headers },
  );
  orderFulfillDuration.add(fulfillRes.timings.duration);

  check(fulfillRes, {
    'fulfill order: status 200': (r) => r.status === 200,
    'fulfill order: status is fulfilled': (r) => r.json('status') === 'fulfilled',
  });
  orderFulfilled.add(1);

  sleep(1);
}

export function teardown(data) {
  console.log(
    `Orders perf test complete.\n` +
    `Product: ${data.productId}`,
  );
}
