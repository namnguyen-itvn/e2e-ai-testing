/**
 * DIRECTORY: src/common/
 * PURPOSE: Shared utilities used across all feature modules.
 *
 * Will contain:
 * ─────────────────────────────────────────────────────
 * filters/          → Global exception filters (format error responses)
 * interceptors/     → Logging, response transformation interceptors
 * guards/           → Authentication guards (JWT, roles)
 * decorators/       → Custom decorators (e.g., @CurrentUser())
 * pipes/            → Validation pipes
 * dto/              → Shared DTOs (pagination, base response)
 * constants/        → App-wide constants
 * ─────────────────────────────────────────────────────
 *
 * RULE: Nothing in common/ should import from feature modules (modules/).
 * Data flows: common/ → modules/, never the reverse.
 */

export {}; // placeholder — will be replaced by actual utilities
