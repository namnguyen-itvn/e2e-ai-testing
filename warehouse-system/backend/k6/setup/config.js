/**
 * FILE: k6/setup/config.js
 * PURPOSE: Centralized configuration for all k6 performance tests.
 *
 * PERFORMANCE TESTING CONCEPTS:
 * ─────────────────────────────────────────────────────────────
 * VU (Virtual User): simulated concurrent user
 * Ramp-up:   gradually increase VUs (avoid thundering herd)
 * Steady:    maintain load at peak to observe behavior
 * Ramp-down: gradually reduce load
 *
 * TEST TYPES:
 * - Smoke Test:    1-2 VUs — verify the script works at all
 * - Load Test:     normal expected load — verify SLA compliance
 * - Stress Test:   above normal load — find breaking point
 * - Spike Test:    sudden huge spike — test auto-scaling
 * - Soak Test:     sustained load for hours — find memory leaks
 * ─────────────────────────────────────────────────────────────
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

/**
 * SLA THRESHOLDS — Service Level Agreement definitions.
 * These define what "acceptable performance" means for this system.
 *
 * p(95) < 500  → 95% of requests complete within 500ms
 * p(99) < 1000 → 99% of requests complete within 1 second
 * rate > 0.99  → error rate must be below 1%
 */
export const THRESHOLDS = {
  // HTTP duration thresholds (applies to all requests)
  http_req_duration: ['p(95)<500', 'p(99)<1000'],

  // Error rate: less than 1% of requests should fail
  http_req_failed: ['rate<0.01'],

  // Throughput: must handle at least 100 requests per second
  http_reqs: ['rate>100'],
};

/**
 * SCENARIO PROFILES — reusable load patterns.
 *
 * ramping-vus: gradually ramp up → steady → ramp down
 * This mirrors real-world traffic patterns.
 */

/** Smoke: just 1 VU, minimal duration — verify no crashes */
export const SMOKE_SCENARIO = {
  executor: 'ramping-vus',
  startVUs: 1,
  stages: [
    { duration: '10s', target: 1 },
    { duration: '10s', target: 0 },
  ],
};

/** Load: normal production traffic */
export const LOAD_SCENARIO = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 VUs
    { duration: '1m',  target: 20 },  // Steady state: 1 minute at 20 VUs
    { duration: '20s', target: 0 },   // Ramp down
  ],
};

/** Stress: 2x normal load — find limits */
export const STRESS_SCENARIO = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '30s', target: 20 },
    { duration: '30s', target: 40 },
    { duration: '1m',  target: 40 },  // Push to 40 VUs
    { duration: '30s', target: 0 },
  ],
};

/** Spike: sudden burst of 100 VUs then back to normal */
export const SPIKE_SCENARIO = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '10s', target: 5   },  // Normal baseline
    { duration: '10s', target: 100 },  // Sudden spike!
    { duration: '30s', target: 100 },  // Hold spike
    { duration: '10s', target: 5   },  // Recovery
    { duration: '10s', target: 0   },
  ],
};

/** Select scenario based on TEST_TYPE env var (default: load) */
export function getScenario() {
  const type = (__ENV.TEST_TYPE || 'load').toLowerCase();
  const map = {
    smoke:  SMOKE_SCENARIO,
    load:   LOAD_SCENARIO,
    stress: STRESS_SCENARIO,
    spike:  SPIKE_SCENARIO,
  };
  return map[type] || LOAD_SCENARIO;
}
