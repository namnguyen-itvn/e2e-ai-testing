/**
 * FILE: src/modules/audit/audit.controller.ts
 *
 * API ENDPOINTS (Admin only):
 * GET /api/audit/logs                        → Query audit logs with filters
 * GET /api/audit/logs/:entityName/:entityId  → Full history of one record
 */

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditAction } from './entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)          // All audit endpoints require auth
@Roles(UserRole.ADMIN, UserRole.AUDITOR)       // Only admin and auditor roles
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Query audit logs with optional filters (Admin/Auditor only)' })
  @ApiQuery({ name: 'entityName', required: false, example: 'products' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'performedBy', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  findAll(
    @Query('entityName') entityName?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: AuditAction,
    @Query('performedBy') performedBy?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.auditService.findAll({
      entityName,
      entityId,
      action,
      performedBy,
      page,
      limit,
    });
  }

  @Get('logs/:entityName/:entityId')
  @ApiOperation({ summary: 'Get full audit history for a specific entity record' })
  getEntityHistory(
    @Param('entityName') entityName: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(entityName, entityId);
  }
}
