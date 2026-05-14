/**
 * FILE: k6/smoke/auth.smoke.js
 * PURPOSE: Smoke test for Authentication endpoints.
 *
 * WHAT IS A SMOKE TEST?
 * ─────────────────────────────────────────────────────────────
 * A smoke test runs with the ABSOLUTE MINIMUM load (1-2 VUs) to
 * verify that:
 *   1. The server is up and reachable
 *   2. All critical endpoints return the expected status codes
 *   3. Response payloads have the expected shape
 *   4. No immediate crashes or 500 errors under trivial load
 *
 * Run this:
 *   - After every deployment (quick sanity check)
 *   - Before running heavier load/stress tests
 *   - In CI/CD pipelines (fast, < 1 minute)
 *
 * HOW TO RUN:
 *   k6 run k6/smoke/auth.smoke.js
 *   k6 run --out json=k6/reports/auth-smoke.json k6/smoke/auth.smoke.js
 * ─────────────────────────────────────────────────────────────
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL } from '../setup/config.js';
import { JSON_HEADERS, uniqueEmail, assertStatus } from '../setup/helpers.js';
import { getThresholds } from '../setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const loginSuccessCount  = new Counter('auth_login_success');
const loginDuration      = new Trend('auth_login_duration', true);
const registerDuration   = new Trend('auth_register_duration', true);

// ── Smoke Options ─────────────────────────────────────────────────────────
export const options = {
  // Smoke: 1 VU, short duration — just confirm the API is alive
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 1 },  // Hold 1 VU for 10 seconds
        { duration: '5s',  target: 0 },  // Graceful ramp-down
      ],
    },
  },
  thresholds: getThresholds('auth', 'smoke'),
  // Human-readable summary in console
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Setup: runs once before VUs start ─────────────────────────────────────
export function setup() {
  // Pre-create a user so login tests have a valid account
  const email    = `smoke_auth_${Date.now()}@warehouse.com`;
  const password = 'Smoke@1234';

  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      email,
      firstName: 'Smoke',
      lastName:  'Test',
      password,
      role: 'staff',
    }),
    { headers: JSON_HEADERS },
  );

  check(res, { 'smoke setup: register → 201': (r) => r.status === 201 });
  return { email, password };
}

// ── Default Function: runs once per VU iteration ───────────────────────────
export default function (data) {
  const { email, password } = data;

  // ── GROUP 1: Login with valid credentials
  group('POST /auth/login (valid)', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email, password }),
      { headers: JSON_HEADERS },
    );
    loginDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 200':          (r) => r.status === 200,
      'body has accessToken':   (r) => typeof r.json('accessToken') === 'string',
      'body has user object':   (r) => typeof r.json('user') === 'object',
      'no password in user':    (r) => r.json('user.password') === undefined,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    loginSuccessCount.add(ok ? 1 : 0);
  });

  sleep(0.5);

  // ── GROUP 2: Register a new unique user
  group('POST /auth/register (new user)', () => {
    const newEmail = uniqueEmail();
    const res = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        email:     newEmail,
        firstName: 'Smoke',
        lastName:  'User',
        password:  'Smoke@1234',
      }),
      { headers: JSON_HEADERS },
    );
    registerDuration.add(res.timings.duration);

    check(res, {
      'status is 201':          (r) => r.status === 201,
      'body has id':            (r) => typeof r.json('id') === 'string',
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });

  sleep(0.5);

  // ── GROUP 3: Invalid login → must return 401
  group('POST /auth/login (invalid credentials)', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email, password: 'WrongPassword!' }),
      { headers: JSON_HEADERS },
    );

    check(res, {
      'status is 401':          (r) => r.status === 401,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });

  sleep(1);
}
