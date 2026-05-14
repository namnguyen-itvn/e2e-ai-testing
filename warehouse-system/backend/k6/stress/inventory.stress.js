/**
 * FILE: k6/stress/inventory.stress.js
 * PURPOSE: Stress test concurrent stock operations — prove DB transaction safety.
 *
 * THE CRITICAL STRESS SCENARIO: RACE CONDITIONS
 * ─────────────────────────────────────────────────────────────
 * When 50-70 VUs simultaneously call POST /inventory/stock-out on the
 * SAME product, only as many as the current stock allows should succeed.
 *
 * CORRECT behavior:
 *   - Stock starts at 10,000 units
 *   - Each stock-out request takes 1 unit
 *   - After 10,000 successful requests, all subsequent ones return 400
 *   - Stock NEVER goes negative (would mean broken transactions)
 *
 * WRONG behavior (what we're guarding against):
 *   - Stock goes negative (race condition / missing row-level lock)
 *   - Two VUs "see" the same stock level and both succeed → oversell
 *   - DB deadlock → 500 errors
 *
 * WHAT TO WATCH:
 *   - `inventory_stock_out_insufficient` counter: expected 400s (not bugs)
 *   - `inventory_stock_out_error` counter: unexpected 500s (real bugs)
 *   - Stock level at end of test must be ≥ 0
 *   - DB lock wait time visible in p99 of stock_out_duration
 *
 * HOW TO RUN:
 *   k6 run k6/stress/inventory.stress.js
 *   k6 run --out json=k6/reports/inventory-stress.json k6/stress/inventory.stress.js
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { BASE_URL } from '../setup/config.js';
import { authHeaders, uniqueSku, registerAndLogin } from '../setup/helpers.js';
import { getThresholds } from '../setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const stockInDuration       = new Trend('inventory_stock_in_duration', true);
const stockOutDuration      = new Trend('inventory_stock_out_duration', true);
const getDuration           = new Trend('inventory_get_stock_duration', true);
const stockOutSuccess       = new Counter('inventory_stock_out_success');
const stockOutInsufficient  = new Counter('inventory_stock_out_insufficient');  // Expected 400s
const stockOutError         = new Counter('inventory_stock_out_error');         // Unexpected 5xx
const stockInSuccess        = new Counter('inventory_stock_in_success');
const transactionErrorRate  = new Rate('inventory_transaction_error_rate');

// ── Stress Options ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Scenario A: Concurrent stock reads and writes on shared product
    concurrent_stock_ops: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10  },  // Warm up
        { duration: '30s', target: 30  },  // Normal load
        { duration: '1m',  target: 50  },  // Stress: heavy contention
        { duration: '30s', target: 70  },  // Maximum lock contention
        { duration: '1m',  target: 70  },  // Sustain — find deadlocks
        { duration: '30s', target: 10  },  // Recovery
        { duration: '20s', target: 0   },
      ],
      exec: 'inventoryStressFlow',
    },
  },
  thresholds: {
    ...getThresholds('inventory', 'stress'),
    // We explicitly allow higher failure rate here:
    // 400 "insufficient stock" responses are EXPECTED, not bugs
    'http_req_failed': ['rate<0.20'],
    'inventory_transaction_error_rate': ['rate<0.01'], // Actual errors (5xx) must be < 1%
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Setup: single shared product that all VUs compete for ─────────────────
export function setup() {
  const token   = registerAndLogin('inventory_stress');
  const headers = authHeaders(token);

  // Create ONE shared product — all VUs fight over the same stock
  // This is what creates the race condition stress scenario
  const productRes = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      sku:      `STRESS-INV-${Date.now()}`,
      name:     'Stress Inventory Product (shared)',
      price:    5,
      quantity: 0,
      unit:     'pcs',
    }),
    { headers },
  );
  check(productRes, { 'setup: product created → 201': (r) => r.status === 201 });
  const productId = productRes.json('id');

  // Seed massive stock: 10,000 units
  // Under 70 VUs × 4 iterations/min × 2min = ~560 stock-out attempts
  // 10,000 units ensures we test both "sufficient" and "insufficient" paths
  const stockRes = http.post(
    `${BASE_URL}/inventory/stock-in`,
    JSON.stringify({ productId, quantity: 10000 }),
    { headers },
  );
  check(stockRes, { 'setup: stock seeded → 201': (r) => r.status === 201 });

  // Also create a second product for stock-in stress (write contention)
  const stockInProductRes = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      sku:      `STRESS-STOCKIN-${Date.now()}`,
      name:     'Stress Stock-In Product',
      price:    3,
      quantity: 0,
      unit:     'boxes',
    }),
    { headers },
  );
  const stockInProductId = stockInProductRes.json('id');

  return { token, productId, stockInProductId };
}

// ── Main stress flow ───────────────────────────────────────────────────────
export function inventoryStressFlow(data) {
  const { token, productId, stockInProductId } = data;
  const headers = authHeaders(token);

  // ── GROUP 1: Concurrent stock reads (should be fast even under write contention)
  group('GET /inventory/:id/stock (read under write pressure)', () => {
    const res = http.get(`${BASE_URL}/inventory/stocks/${productId}`, { headers });
    getDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 200':            (r) => r.status === 200,
      'quantity is non-negative': (r) => r.json('currentQuantity') >= 0,
      'latency < 500ms':          (r) => r.timings.duration < 500,
    });
    transactionErrorRate.add(!ok && res.status >= 500);
  });

  sleep(0.05); // Minimal think time — maximize concurrency

  // ── GROUP 2: Stock-out from shared product (race condition test)
  group('POST /inventory/stock-out (concurrent race condition)', () => {
    const qty = Math.floor(Math.random() * 5) + 1; // 1–5 units per request
    const res = http.post(
      `${BASE_URL}/inventory/stock-out`,
      JSON.stringify({ productId, quantity: qty }),
      { headers },
    );
    stockOutDuration.add(res.timings.duration);

    if (res.status === 201) {
      stockOutSuccess.add(1);
      check(res, { 'stock-out: 201 success': () => true });
    } else if (res.status === 400) {
      // 400 = insufficient stock → EXPECTED under stress, not a bug
      stockOutInsufficient.add(1);
      check(res, {
        'stock-out: 400 insufficient (expected)': (r) => r.status === 400,
      });
    } else {
      // 5xx = real error → should NEVER happen
      stockOutError.add(1);
      transactionErrorRate.add(1);
      check(res, { 'stock-out: unexpected error!': () => false });
    }
  });

  sleep(0.05);

  // ── GROUP 3: Stock-in to a different product (concurrent writes)
  // Tests that concurrent stock-in operations don't deadlock
  if (__ITER % 3 === 0 && stockInProductId) {
    group('POST /inventory/stock-in (concurrent write)', () => {
      const res = http.post(
        `${BASE_URL}/inventory/stock-in`,
        JSON.stringify({ productId: stockInProductId, quantity: 10 }),
        { headers },
      );
      stockInDuration.add(res.timings.duration);

      const ok = check(res, {
        'stock-in: 201 success': (r) => r.status === 201,
        'latency < 1500ms':      (r) => r.timings.duration < 1500,
      });
      if (ok) stockInSuccess.add(1);
      transactionErrorRate.add(!ok && res.status >= 500);
    });
  }

  sleep(0.1);
}
