/**
 * FILE: k6/stress/auth.stress.js
 * PURPOSE: Stress test for Authentication endpoints.
 *
 * WHAT IS A STRESS TEST?
 * ─────────────────────────────────────────────────────────────
 * A stress test progressively pushes VUs ABOVE normal production load
 * to find:
 *   1. The performance breaking point (where latency degrades sharply)
 *   2. Error rate changes under extreme load
 *   3. CPU saturation (bcrypt is CPU-bound — hits the wall fast)
 *   4. Memory behavior under sustained high concurrency
 *   5. Recovery: does the system return to normal after load drops?
 *
 * AUTH STRESS INSIGHT:
 *   bcrypt password hashing is intentionally slow (~100-300ms per hash).
 *   Under high concurrency, bcrypt becomes the bottleneck — the Node.js
 *   thread pool gets saturated. This test finds exactly how many concurrent
 *   login requests the server can sustain before response times spike.
 *
 * EXPECTED BEHAVIOR UNDER STRESS:
 *   - p95 latency climbs from ~200ms (normal) toward 2500ms (limit)
 *   - Error rate stays near 0% (server should queue, not drop)
 *   - CPU usage hits 90-100% during peak
 *   - After ramp-down, system recovers (p95 returns to normal)
 *
 * HOW TO RUN:
 *   k6 run k6/stress/auth.stress.js
 *   k6 run --out json=k6/reports/auth-stress.json k6/stress/auth.stress.js
 * ─────────────────────────────────────────────────────────────
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { BASE_URL } from '../setup/config.js';
import { JSON_HEADERS, uniqueEmail, assertStatus } from '../setup/helpers.js';
import { getThresholds } from '../setup/thresholds.js';

// ── Custom Metrics ────────────────────────────────────────────────────────
const loginSuccessCount = new Counter('auth_login_success');
const loginFailCount    = new Counter('auth_login_fail');
const loginDuration     = new Trend('auth_login_duration', true);
const registerDuration  = new Trend('auth_register_duration', true);
const authErrorRate     = new Rate('auth_error_rate');

// ── Stress Options ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10  },  // Warm-up: normal load
        { duration: '30s', target: 30  },  // Ramp to 3× normal
        { duration: '1m',  target: 50  },  // Stress: 5× normal — find the limit
        { duration: '30s', target: 70  },  // Push harder
        { duration: '30s', target: 70  },  // Hold stress peak
        { duration: '30s', target: 10  },  // Recovery ramp-down
        { duration: '20s', target: 0   },  // Graceful shutdown
      ],
    },
  },
  thresholds: {
    ...getThresholds('auth', 'stress'),
    'auth_error_rate': ['rate<0.05'],  // < 5% errors even under stress
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Setup: create a shared user for concurrent login tests ─────────────────
export function setup() {
  const email    = `stress_auth_${Date.now()}@warehouse.com`;
  const password = 'Stress@1234';

  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      email,
      firstName: 'Stress',
      lastName:  'Test',
      password,
      role: 'staff',
    }),
    { headers: JSON_HEADERS },
  );
  check(res, { 'stress setup: register → 201': (r) => r.status === 201 });
  return { email, password };
}

// ── Default: aggressive concurrent auth operations ─────────────────────────
export default function (data) {
  const { email, password } = data;

  // ── Login with valid credentials (heavy bcrypt path)
  group('POST /auth/login (valid — high concurrency)', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email, password }),
      { headers: JSON_HEADERS },
    );
    loginDuration.add(res.timings.duration);

    const ok = check(res, {
      'status is 200':        (r) => r.status === 200,
      'has accessToken':      (r) => typeof r.json('accessToken') === 'string',
      'latency < 2500ms':     (r) => r.timings.duration < 2500,
    });

    ok ? loginSuccessCount.add(1) : loginFailCount.add(1);
    authErrorRate.add(!ok);
  });

  // No sleep intentional on login group — maximize concurrency pressure
  sleep(0.1);

  // ── Register unique users (1 in 5 iterations — writes stress the DB)
  if (__ITER % 5 === 0) {
    group('POST /auth/register (new user — write stress)', () => {
      const res = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({
          email:     uniqueEmail(),
          firstName: `Stress${__VU}`,
          lastName:  `User${__ITER}`,
          password:  'Stress@1234',
        }),
        { headers: JSON_HEADERS },
      );
      registerDuration.add(res.timings.duration);

      const ok = check(res, {
        'status is 201': (r) => r.status === 201,
        'latency < 3000ms': (r) => r.timings.duration < 3000,
      });
      authErrorRate.add(!ok);
    });
  }

  // ── Invalid logins simulate real-world failed auth traffic
  group('POST /auth/login (invalid — bcrypt compare stress)', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email, password: 'WrongPassword!' }),
      { headers: JSON_HEADERS },
    );

    check(res, {
      'status is 401': (r) => r.status === 401,
    });
  });

  sleep(0.2);
}
