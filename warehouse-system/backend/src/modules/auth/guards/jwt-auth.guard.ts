/**
 * FILE: src/modules/auth/guards/jwt-auth.guard.ts
 * PURPOSE: Protects routes — blocks unauthenticated requests.
 *
 * Usage on a controller or route:
 * @UseGuards(JwtAuthGuard)
 *
 * If JWT is missing or invalid → automatically returns 401 Unauthorized.
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
