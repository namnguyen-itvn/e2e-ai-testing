/**
 * FILE: k6/setup/thresholds.js
 * PURPOSE: Centralized, scenario-aware SLA threshold definitions.
 *
 * WHY SEPARATE THRESHOLDS PER TEST TYPE?
 * ─────────────────────────────────────────────────────────────
 * Smoke tests  → We only care that nothing crashes. Thresholds are
 *               very relaxed (high latency tolerance, tiny sample size).
 *
 * Load tests   → Normal production traffic. Thresholds match your SLA.
 *               p(95) < 500ms is a typical API SLA target.
 *
 * Stress tests → Above-normal load pushing the system toward limits.
 *               We relax thresholds slightly — we EXPECT degradation.
 *               The goal is to find the breaking point, not to pass SLA.
 *               Error rate is raised to 5% to allow for expected failures.
 *
 * Spike tests  → Sudden extreme traffic burst.
 *               Focus on survival: error rate < 10%, no crashes,
 *               recovery after the spike is the key metric.
 * ─────────────────────────────────────────────────────────────
 */

// ── Base shared thresholds (applies to all scenarios) ─────────────────────

/** Smoke: minimal correctness check — just verify the API doesn't crash */
export const SMOKE_THRESHOLDS = {
  http_req_duration: ['p(95)<2000'],  // Very lenient: 2s at p95 (only 1-2 VUs)
  http_req_failed:   ['rate<0.05'],   // < 5% errors (we only have 1 VU)
};

/** Load: production SLA compliance check */
export const LOAD_THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed:   ['rate<0.01'],  // < 1% error rate
  http_reqs:         ['rate>50'],    // Must handle > 50 req/s
};

/** Stress: finding limits — we relax thresholds but still gate on crashes */
export const STRESS_THRESHOLDS = {
  http_req_duration: ['p(95)<1500', 'p(99)<3000'],  // Allow degradation
  http_req_failed:   ['rate<0.05'],                  // < 5% errors
  http_reqs:         ['rate>30'],                    // Lower throughput expected
};

/** Spike: survival mode — system must recover after the burst */
export const SPIKE_THRESHOLDS = {
  http_req_duration: ['p(95)<3000', 'p(99)<5000'],  // Expect high latency at peak
  http_req_failed:   ['rate<0.10'],                  // Allow 10% errors at spike peak
};

// ── Module-specific threshold extensions ──────────────────────────────────
// These are ADDED ON TOP of the base thresholds above.
// Use spread operator: { ...SMOKE_THRESHOLDS, ...AUTH_SMOKE_THRESHOLDS }

export const AUTH_SMOKE_THRESHOLDS = {
  'auth_login_duration':    ['p(95)<2000'],
  'auth_register_duration': ['p(95)<2000'],
  'auth_login_success':     ['count>0'],
};

export const AUTH_STRESS_THRESHOLDS = {
  // bcrypt is CPU-bound — allow more time under stress
  'auth_login_duration':    ['p(95)<2500', 'p(99)<4000'],
  'auth_register_duration': ['p(95)<3000'],
  'auth_login_success':     ['count>0'],
};

export const PRODUCTS_SMOKE_THRESHOLDS = {
  'products_get_list_duration': ['p(95)<2000'],
  'products_get_one_duration':  ['p(95)<2000'],
  'products_create_duration':   ['p(95)<2000'],
  'products_error_rate':        ['rate<0.05'],
};

export const PRODUCTS_STRESS_THRESHOLDS = {
  'products_get_list_duration': ['p(95)<800'],   // Allow degradation vs 300ms in load
  'products_get_one_duration':  ['p(95)<600'],
  'products_create_duration':   ['p(95)<1000'],
  'products_error_rate':        ['rate<0.05'],
};

export const INVENTORY_SMOKE_THRESHOLDS = {
  'inventory_stock_in_duration':  ['p(95)<2000'],
  'inventory_stock_out_duration': ['p(95)<2000'],
  'inventory_get_stock_duration': ['p(95)<2000'],
};

export const INVENTORY_STRESS_THRESHOLDS = {
  // Inventory under stress: DB row-level locks cause contention
  'inventory_stock_in_duration':  ['p(95)<1500'],
  'inventory_stock_out_duration': ['p(95)<1500'],
  'inventory_get_stock_duration': ['p(95)<500'],
  // More 400s expected under stress (race for limited stock)
  'http_req_failed': ['rate<0.15'],
};

export const ORDERS_SMOKE_THRESHOLDS = {
  'orders_create_duration':  ['p(95)<2000'],
  'orders_confirm_duration': ['p(95)<2000'],
  'orders_fulfill_duration': ['p(95)<2000'],
};

export const ORDERS_STRESS_THRESHOLDS = {
  // Order confirmation triggers inventory deduction → compound latency
  'orders_create_duration':  ['p(95)<1500'],
  'orders_confirm_duration': ['p(95)<2000'],
  'orders_fulfill_duration': ['p(95)<1000'],
};

/**
 * Helper to get thresholds for a given module + test type combination.
 *
 * USAGE (inside a scenario file):
 *   import { getThresholds } from '../setup/thresholds.js';
 *   export const options = { thresholds: getThresholds('auth', 'smoke') };
 */
export function getThresholds(module, testType = 'load') {
  const baseMap = {
    smoke:  SMOKE_THRESHOLDS,
    load:   LOAD_THRESHOLDS,
    stress: STRESS_THRESHOLDS,
    spike:  SPIKE_THRESHOLDS,
  };

  const moduleMap = {
    auth: {
      smoke:  AUTH_SMOKE_THRESHOLDS,
      stress: AUTH_STRESS_THRESHOLDS,
    },
    products: {
      smoke:  PRODUCTS_SMOKE_THRESHOLDS,
      stress: PRODUCTS_STRESS_THRESHOLDS,
    },
    inventory: {
      smoke:  INVENTORY_SMOKE_THRESHOLDS,
      stress: INVENTORY_STRESS_THRESHOLDS,
    },
    orders: {
      smoke:  ORDERS_SMOKE_THRESHOLDS,
      stress: ORDERS_STRESS_THRESHOLDS,
    },
  };

  const base   = baseMap[testType]   || LOAD_THRESHOLDS;
  const extra  = (moduleMap[module] || {})[testType] || {};

  return { ...base, ...extra };
}
