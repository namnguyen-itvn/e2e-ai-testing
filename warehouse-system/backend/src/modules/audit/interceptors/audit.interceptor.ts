/**
 * FILE: src/modules/audit/interceptors/audit.interceptor.ts
 * PURPOSE: Automatically write audit logs for all mutating HTTP requests.
 *
 * CONCEPT — INTERCEPTOR:
 * ─────────────────────────────────────────────────────────────
 * NestJS Interceptors wrap around route handlers, similar to middleware.
 * They can execute code BEFORE and AFTER a request is processed.
 *
 * This interceptor uses RxJS tap() to:
 * 1. Let the request proceed normally
 * 2. AFTER response is sent → write audit log asynchronously
 *
 * WHY USE AN INTERCEPTOR instead of calling auditService.log() manually?
 * - DRY principle: one place handles all audit logging
 * - Services stay clean — no audit concerns mixed in
 * - Easy to enable/disable audit logging globally or per-route
 * - AOP (Aspect-Oriented Programming) pattern
 * ─────────────────────────────────────────────────────────────
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditService } from '../audit.service';
import { AuditAction } from '../entities/audit-log.entity';

/** Map HTTP methods to AuditAction enum values */
const METHOD_ACTION_MAP: Record<string, AuditAction> = {
  POST:   AuditAction.CREATE,
  PUT:    AuditAction.UPDATE,
  PATCH:  AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

/** Extract entity name from URL path: /api/products/123 → 'products' */
function extractEntityName(url: string): string {
  const parts = url.replace('/api/', '').split('/');
  return parts[0] ?? 'unknown';
}

/** Extract entity ID from URL: /api/products/abc-123 → 'abc-123' */
function extractEntityId(url: string): string | null {
  const parts = url.replace('/api/', '').split('/');
  // parts[1] is the ID segment (if exists and looks like a UUID)
  const candidate = parts[1];
  if (!candidate || candidate.includes('?')) return null;
  return candidate;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, headers } = request;

    // Only log mutating operations (not GET/HEAD/OPTIONS)
    const action = METHOD_ACTION_MAP[method];
    if (!action) {
      return next.handle(); // Pass through read requests without logging
    }

    const entityName = extractEntityName(url);
    const entityId = extractEntityId(url);
    const performedBy = (request as any).user?.email ?? null;
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ??
      request.socket?.remoteAddress ??
      null;
    const userAgent = headers['user-agent'] ?? null;

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          // After successful response → write audit log
          this.auditService
            .log({
              action,
              entityName,
              entityId: responseBody?.id ?? entityId,
              oldValue: null, // Future: capture old value from service layer
              newValue: responseBody ?? null,
              performedBy,
              ipAddress,
              userAgent,
              metadata: {
                method,
                url,
                requestBody: this.sanitizeBody(body),
              },
            })
            .catch((err) =>
              this.logger.error('Audit log write failed (interceptor)', err),
            );
        },
        error: (error) => {
          // Log failed attempts too — important for security monitoring
          this.auditService
            .log({
              action,
              entityName,
              entityId,
              performedBy,
              ipAddress,
              userAgent,
              metadata: {
                method,
                url,
                error: error?.message,
                statusCode: error?.status,
              },
            })
            .catch(() => {}); // Silent fail
        },
      }),
    );
  }

  /**
   * Remove sensitive fields from request body before logging.
   * NEVER log passwords, tokens, or credit card numbers.
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard'];
    const sanitized = { ...body };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
