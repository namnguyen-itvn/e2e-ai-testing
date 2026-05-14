/**
 * FILE: test/e2e/auth.e2e-spec.ts
 * PURPOSE: E2E tests for Auth flow — register, login, profile, validation.
 *
 * These tests hit the REAL HTTP server with a REAL test database.
 * They verify the complete request → response cycle including:
 * - Route matching
 * - ValidationPipe (DTO validation)
 * - Service business logic
 * - Database writes/reads
 * - HTTP status codes
 * - Response body structure
 */

import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as requestLib from 'supertest';
import { createTestApp } from '../helpers/test-app.helper';

const request = (requestLib as any).default ?? requestLib;

describe('Auth E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    // Clean users table before each test to ensure isolation
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM users');
    await app.close();
  });

  // ── POST /api/auth/register ──────────────────────────────────────

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'e2e@warehouse.com',
      firstName: 'E2E',
      lastName: 'Tester',
      password: 'Test@1234',
      role: 'admin',
    };

    it('201 — should register a new user successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      expect(res.body).toMatchObject({
        email: validUser.email,
        firstName: validUser.firstName,
        role: 'admin',
      });

      // CRITICAL: password must NEVER appear in response
      expect(res.body).not.toHaveProperty('password');

      // UUID format check
      expect(res.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('409 — should reject duplicate email registration', async () => {
      // Register once
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      // Register again with same email
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(409);

      expect(res.body.message).toContain('already registered');
    });

    it('400 — should reject invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...validUser, email: 'not-an-email' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('400 — should reject password shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...validUser, password: 'short' })
        .expect(400);
    });

    it('400 — should reject unknown extra fields (whitelist validation)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...validUser, hackerField: 'malicious' })
        .expect(400);
    });
  });

  // ── POST /api/auth/login ─────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    const user = {
      email: 'login@warehouse.com',
      firstName: 'Login',
      lastName: 'Test',
      password: 'Test@1234',
    };

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(user);
    });

    it('200 — should return JWT token on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).not.toHaveProperty('password');

      // JWT format: 3 base64 segments separated by dots
      expect(res.body.accessToken.split('.')).toHaveLength(3);
    });

    it('401 — should reject wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: 'WrongPassword' })
        .expect(401);

      // SECURITY: generic message — must NOT reveal whether email exists
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('401 — should reject non-existent email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@warehouse.com', password: 'Test@1234' })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  // ── GET /api/auth/profile ────────────────────────────────────────

  describe('GET /api/auth/profile', () => {
    it('200 — should return user profile with valid JWT', async () => {
      const user = {
        email: `profile_${Date.now()}@warehouse.com`,
        firstName: 'Profile',
        lastName: 'Test',
        password: 'Test@1234',
      };

      await request(app.getHttpServer()).post('/api/auth/register').send(user);
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });

      const token = loginRes.body.accessToken;

      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe(user.email);
      expect(res.body).not.toHaveProperty('password');
    });

    it('401 — should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('401 — should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });
});
