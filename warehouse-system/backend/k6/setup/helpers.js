/**
 * FILE: k6/setup/helpers.js
 * PURPOSE: Shared utility functions for all k6 test scripts.
 *
 * These helpers:
 * - Standardize HTTP headers
 * - Log errors with context for debugging
 * - Generate unique test data to prevent conflicts
 * - Provide assertion helpers with clear failure messages
 */

import http from 'k6/http';
import { check, fail } from 'k6';
import { BASE_URL } from './config.js';

/** Standard JSON headers for all API requests */
export const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

/** Authenticated headers — include JWT token */
export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Login and return JWT access token.
 * Used in setup() phase — runs once before VUs start.
 */
export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS },
  );

  const ok = check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: has accessToken': (r) => r.json('accessToken') !== undefined,
  });

  if (!ok) {
    fail(`Login failed for ${email}: ${res.status} ${res.body}`);
  }

  return res.json('accessToken');
}

/**
 * Register a test user and return their token.
 * Useful for setup() when you need a fresh user per test run.
 */
export function registerAndLogin(suffix = '') {
  const email = `perf_${suffix}_${Date.now()}@warehouse.com`;
  const password = 'Perf@1234';

  // Register
  http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      email,
      firstName: 'Perf',
      lastName: 'Test',
      password,
      role: 'admin',
    }),
    { headers: JSON_HEADERS },
  );

  // Login and get token
  return login(email, password);
}

/**
 * Generate a unique SKU for each VU iteration.
 * Prevents UniqueConstraint conflicts between concurrent VUs.
 *
 * __VU  = current virtual user number (1, 2, 3, ...)
 * __ITER = current iteration count for this VU
 */
export function uniqueSku() {
  return `PERF-${__VU}-${__ITER}-${Date.now()}`;
}

/** Unique email for each VU/iteration */
export function uniqueEmail() {
  return `vu${__VU}_iter${__ITER}_${Date.now()}@perf.test`;
}

/**
 * assertStatus — check HTTP status with a meaningful failure message.
 * Better than bare check() because it shows the actual response on failure.
 */
export function assertStatus(res, expectedStatus, label) {
  const ok = check(res, {
    [`${label}: status ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });

  if (!ok) {
    console.error(
      `[FAIL] ${label}: expected ${expectedStatus}, got ${res.status}. Body: ${res.body?.substring(0, 200)}`,
    );
  }

  return ok;
}

/**
 * assertResponseTime — verify response is within SLA threshold.
 */
export function assertResponseTime(res, maxMs, label) {
  return check(res, {
    [`${label}: response < ${maxMs}ms`]: (r) => r.timings.duration < maxMs,
  });
}
