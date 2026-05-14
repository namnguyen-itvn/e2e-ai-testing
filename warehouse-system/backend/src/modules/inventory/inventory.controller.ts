/**
 * FILE: src/modules/inventory/inventory.controller.ts
 *
 * API ENDPOINTS:
 * ─────────────────────────────────────────────────────────────
 * POST  /api/inventory/stock-in              → Nhập kho
 * POST  /api/inventory/stock-out             → Xuất kho
 * POST  /api/inventory/adjust                → Điều chỉnh tồn kho
 * GET   /api/inventory/stocks                → Danh sách tồn kho (paginated)
 * GET   /api/inventory/stocks/low-stock      → Danh sách hàng sắp hết
 * GET   /api/inventory/stocks/:productId     → Tồn kho của 1 sản phẩm
 * GET   /api/inventory/history/:productId    → Lịch sử giao dịch của 1 sản phẩm
 * ─────────────────────────────────────────────────────────────
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Stock Operations ────────────────────────────────────────────────

  @Post('stock-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Receive stock into warehouse (nhập kho)' })
  stockIn(@Body() dto: StockInDto) {
    return this.inventoryService.stockIn(dto);
  }

  @Post('stock-out')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue stock from warehouse (xuất kho)' })
  stockOut(@Body() dto: StockOutDto) {
    return this.inventoryService.stockOut(dto);
  }

  @Post('adjust')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Manually adjust stock to absolute quantity' })
  adjustStock(@Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(dto);
  }

  // ── Stock Queries ───────────────────────────────────────────────────

  @Get('stocks')
  @ApiOperation({ summary: 'Get all product stock levels (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getAllStocks(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.inventoryService.getAllStocks(page, limit);
  }

  @Get('stocks/low-stock')
  @ApiOperation({ summary: 'Get products with stock at or below threshold' })
  getLowStockItems() {
    return this.inventoryService.getLowStockItems();
  }

  @Get('stocks/:productId')
  @ApiOperation({ summary: 'Get current stock for a specific product' })
  getStock(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.getStock(productId);
  }

  @Get('history/:productId')
  @ApiOperation({ summary: 'Get stock transaction history for a product' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getHistory(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.inventoryService.getTransactionHistory(productId, page, limit);
  }
}
