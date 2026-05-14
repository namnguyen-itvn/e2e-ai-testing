/**
 * FILE: k6/scenarios/auth.perf.js
 * PURPOSE: Performance test for Authentication endpoints.
 *
 * WHAT WE MEASURE:
 * - Login throughput (requests/second under concurrent load)
 * - Response time percentiles (p95, p99)
 * - Error rate under load
 * - bcrypt performance impact (bcrypt is intentionally slow — find the limit)
 *
 * INSIGHT: bcrypt is CPU-bound and slow by design (security).
 * Under high concurrent login load, the server may become CPU-saturated.
 * This test reveals that bottleneck.
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, getScenario } from '../setup/config.js';
import { JSON_HEADERS, registerAndLogin, uniqueEmail, assertStatus, assertResponseTime } from '../setup/helpers.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
// Custom metrics let you track domain-specific data beyond default k6 metrics.
const loginSuccessCount  = new Counter('auth_login_success');
const loginFailCount     = new Counter('auth_login_fail');
const loginDuration      = new Trend('auth_login_duration', true); // true = include in summary
const registerDuration   = new Trend('auth_register_duration', true);

// ── k6 Options ────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    auth_load: getScenario(),
  },
  thresholds: {
    ...THRESHOLDS,
    // Auth-specific: login must be faster than 800ms at p95
    // (bcrypt adds ~100-200ms, so we allow more than standard APIs)
    'auth_login_duration': ['p(95)<800', 'p(99)<1500'],
    'auth_register_duration': ['p(95)<1000'],
    'auth_login_success': ['count>0'],
  },
};

// ── Setup ─────────────────────────────────────────────────────────────────
// setup() runs ONCE before all VUs start.
// Return value is passed to default() and teardown() as `data`.
export function setup() {
  // Pre-create a shared test user for login tests
  // (avoids creating a new user on every iteration)
  const sharedEmail = `shared_perf_${Date.now()}@warehouse.com`;
  const sharedPassword = 'Perf@1234';

  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      email: sharedEmail,
      firstName: 'Shared',
      lastName: 'PerfUser',
      password: sharedPassword,
      role: 'staff',
    }),
    { headers: JSON_HEADERS },
  );

  check(registerRes, { 'setup: user created': (r) => r.status === 201 });

  return { sharedEmail, sharedPassword };
}

// ── Default Function (runs per VU per iteration) ──────────────────────────
export default function (data) {
  const { sharedEmail, sharedPassword } = data;

  // ── Scenario 1: Login with existing user (most common auth operation)
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: sharedEmail, password: sharedPassword }),
    { headers: JSON_HEADERS },
  );
  loginDuration.add(loginRes.timings.duration);

  const loginOk =
    assertStatus(loginRes, 200, 'login') &&
    assertResponseTime(loginRes, 800, 'login') &&
    check(loginRes, {
      'login: has JWT token': (r) => r.json('accessToken') !== undefined,
      'login: no password in response': (r) => r.json('user.password') === undefined,
    });

  loginOk ? loginSuccessCount.add(1) : loginFailCount.add(1);

  sleep(0.5); // 500ms think time between login and next action

  // ── Scenario 2: Register a new user (less frequent)
  // Only 1 in 5 iterations will test registration to avoid DB bloat
  if (__ITER % 5 === 0) {
    const newEmail = uniqueEmail();
    const regRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        email: newEmail,
        firstName: 'VU',
        lastName: `${__VU}`,
        password: 'Perf@1234',
      }),
      { headers: JSON_HEADERS },
    );
    registerDuration.add(regRes.timings.duration);
    assertStatus(regRes, 201, 'register');
  }

  // ── Scenario 3: Invalid login (simulate wrong password traffic)
  // Real systems always have some % of failed logins
  const badLoginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: sharedEmail, password: 'WrongPassword!' }),
    { headers: JSON_HEADERS },
  );
  assertStatus(badLoginRes, 401, 'bad login');

  sleep(1); // Think time: simulate user reading the page
}

// ── Teardown ──────────────────────────────────────────────────────────────
// teardown() runs ONCE after all VUs finish. Used for cleanup.
export function teardown(data) {
  console.log(`Auth perf test completed. Shared user: ${data.sharedEmail}`);
}
