/**
 * FILE: src/main.ts
 * PURPOSE: Application bootstrap entry point.
 *
 * This is the FIRST file NestJS runs.
 * Its only job: create the app, configure global settings, and start listening.
 *
 * ENTERPRISE ADDITIONS (to add as you grow):
 * - ValidationPipe      → auto-validate all incoming request bodies
 * - Swagger/OpenAPI     → auto-generate API documentation
 * - Helmet              → security HTTP headers
 * - CORS                → cross-origin resource sharing
 * - Global interceptors → logging, response transformation
 */

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuditInterceptor } from './modules/audit/interceptors/audit.interceptor';

async function bootstrap() {
  // Logger is NestJS's built-in logging utility.
  // Use it instead of console.log for structured, level-aware logging.
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // ── Global API Prefix ─────────────────────────────────────────────────
  // All routes will be prefixed with /api (e.g., GET /api/products)
  // This is an enterprise standard — helps with reverse proxies (Nginx, etc.)
  // and clearly separates API routes from static files or docs.
  app.setGlobalPrefix('api');

  /**
   * ValidationPipe — Global Request Validation
   * ──────────────────────────────────────────────────────────
   * Automatically validates ALL incoming request bodies against DTOs.
   * whitelist: true       → strip unknown fields (security: reject extra props)
   * forbidNonWhitelisted  → throw error if extra fields are sent
   * transform: true       → auto-convert types (e.g., string "5" → number 5)
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Global Audit Interceptor ──────────────────────────────────────────
  // Automatically records all CREATE/UPDATE/DELETE actions to audit_logs table.
  app.useGlobalInterceptors(app.get(AuditInterceptor));

  // ── CORS ──────────────────────────────────────────────────────────────
  // Allows frontend clients (React, Vue, etc.) to call this API.
  // In production, restrict 'origin' to your actual frontend domain.
  app.enableCors({
    origin: '*', // TODO: restrict in production (e.g., 'https://yourapp.com')
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // ── Swagger / OpenAPI Documentation ──────────────────────────────────
  // Auto-generates interactive API docs from code decorators.
  // Access at: http://localhost:3000/api/docs
  //
  // WHY SWAGGER?
  // - QA/SDET can explore and test all endpoints visually
  // - Auto-generates API contracts for API automation tools
  // - Frontend team can understand API without reading code
  // - Postman collections can be generated from Swagger JSON
  const swaggerConfig = new DocumentBuilder()
    .setTitle('🏭 Warehouse Management System API')
    .setDescription(
      `Enterprise Warehouse Management API — built with NestJS + TypeORM + PostgreSQL.
      
**Modules:**
- 📦 **Products** — Product catalog management
- 🏪 **Inventory** — Stock tracking, transactions, adjustments  
- 🔐 **Auth** — JWT authentication, role-based access control

**Authentication:** Use the \`/api/auth/login\` endpoint to get a JWT token, then click **Authorize** and paste: \`Bearer <your_token>\``,
    )
    .setVersion('1.0')
    .addBearerAuth() // Adds the "Authorize" button for JWT in Swagger UI
    .addTag('auth', 'Authentication & User Management')
    .addTag('products', 'Product Catalog')
    .addTag('inventory', 'Inventory & Stock Management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep token after page refresh
    },
  });

  // ── Port Configuration ────────────────────────────────────────────────
  // Read APP_PORT from .env, fallback to 3000 if not set.
  const port = process.env.APP_PORT ?? 3000;

  await app.listen(port);

  // Startup confirmation log — very useful in CI/CD and Docker environments
  logger.log(`🚀 Warehouse API is running on: http://localhost:${port}/api`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  logger.log(`🗄️  Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
}

bootstrap();
