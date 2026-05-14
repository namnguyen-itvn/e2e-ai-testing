/**
 * FILE: src/modules/orders/orders.controller.ts
 *
 * POST  /api/orders                → Create order
 * GET   /api/orders                → List orders (filtered, paginated)
 * GET   /api/orders/:id            → Get one order
 * POST  /api/orders/:id/confirm    → Confirm order (deducts stock for SALES)
 * POST  /api/orders/:id/fulfill    → Mark as fulfilled
 * POST  /api/orders/:id/cancel     → Cancel order (returns stock if needed)
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, OrderType } from './entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // All order endpoints require authentication
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new purchase or sales order' })
  @ApiResponse({ status: 201, description: 'Order created with PENDING status' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: any) {
    return this.ordersService.create(dto, user?.email);
  }

  @Get()
  @ApiOperation({ summary: 'List all orders with optional filters' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'type', required: false, enum: OrderType })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('type') type?: OrderType,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.ordersService.findAll({ status, type, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details with all line items' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm order — deducts stock for SALES orders' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or invalid status transition' })
  confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ordersService.confirm(id, user?.email);
  }

  @Post(':id/fulfill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark order as fulfilled/delivered' })
  fulfill(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ordersService.fulfill(id, user?.email);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order — returns stock if SALES order was confirmed' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ordersService.cancel(id, user?.email);
  }
}
