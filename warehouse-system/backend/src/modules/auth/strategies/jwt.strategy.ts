/**
 * FILE: src/modules/auth/strategies/jwt.strategy.ts
 * PURPOSE: Validates JWT tokens on every protected request.
 *
 * HOW JWT AUTH WORKS:
 * ─────────────────────────────────────────────────────────────
 * 1. User logs in → server issues a signed JWT token
 * 2. Client stores token and sends it in every request:
 *    Authorization: Bearer <token>
 * 3. JwtStrategy extracts the token, verifies the signature,
 *    decodes the payload, and attaches user info to request.
 * 4. Protected routes use JwtAuthGuard to enforce authentication.
 * ─────────────────────────────────────────────────────────────
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;    // subject = user ID (standard JWT claim)
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Extract token from "Authorization: Bearer <token>" header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Reject expired tokens automatically
      ignoreExpiration: false,
      // Use the same secret that was used to sign the token
      secretOrKey: configService.get<string>('JWT_SECRET', 'fallback_secret'),
    });
  }

  /**
   * validate() is called AFTER the token signature is verified.
   * The returned object is attached to request.user
   * and available in controllers via @Request() req or @CurrentUser().
   */
  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
