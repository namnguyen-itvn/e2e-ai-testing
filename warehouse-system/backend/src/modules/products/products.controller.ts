/**
 * FILE: src/modules/products/products.controller.ts
 * PURPOSE: Handles HTTP requests and maps them to service methods.
 *
 * CONCEPT — CONTROLLER:
 * ─────────────────────────────────────────────────────────────
 * Controllers are responsible for:
 * 1. Receiving HTTP requests
 * 2. Extracting data (params, body, query)
 * 3. Calling the appropriate Service method
 * 4. Returning the HTTP response
 *
 * Controllers should be THIN — no business logic here.
 * If you find yourself writing complex logic in a controller,
 * move it to the service.
 *
 * API ENDPOINTS CREATED:
 * ─────────────────────────────────────────────────────────────
 * POST   /api/products          → Create a product
 * GET    /api/products          → List all products (paginated)
 * GET    /api/products/:id      → Get one product by ID
 * GET    /api/products/sku/:sku → Get one product by SKU
 * PATCH  /api/products/:id      → Update a product partially
 * DELETE /api/products/:id      → Soft delete a product
 * ─────────────────────────────────────────────────────────────
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * @Controller('products') → maps this controller to /api/products
 * (the /api prefix is set globally in main.ts via app.setGlobalPrefix('api'))
 */
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * POST /api/products
   * Creates a new product.
   *
   * @Body() → extracts and validates the request body using CreateProductDto.
   * ValidationPipe (configured in main.ts) auto-validates the DTO.
   * HTTP 201 Created is the correct status for resource creation.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED) // Returns 201 instead of default 200
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 409, description: 'SKU already exists' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  /**
   * GET /api/products?page=1&limit=20
   * Returns a paginated list of products.
   *
   * @Query() → reads query parameters from the URL.
   * DefaultValuePipe → sets a default if the param is not provided.
   * ParseIntPipe → converts string query param to integer safely.
   */
  @Get()
  @ApiOperation({ summary: 'Get all products (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findAll(page, limit);
  }

  /**
   * GET /api/products/sku/:sku
   * IMPORTANT: This route MUST be defined BEFORE /api/products/:id
   * Otherwise NestJS will try to parse "sku" as a UUID and fail.
   * Route order matters in NestJS!
   */
  @Get('sku/:sku')
  @ApiOperation({ summary: 'Get product by SKU' })
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  /**
   * GET /api/products/:id
   * Returns one product by UUID.
   *
   * ParseUUIDPipe → validates that :id is a valid UUID format.
   * If not a valid UUID → returns 400 Bad Request automatically.
   * This prevents invalid IDs from hitting the database.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get product by UUID' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  /**
   * PATCH /api/products/:id
   * Partially updates a product (only the fields provided in body).
   * PATCH = partial update. PUT = full replacement.
   * Always use PATCH for partial updates — better REST practice.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  /**
   * DELETE /api/products/:id
   * Soft deletes a product (sets deletedAt, does not remove the row).
   * Returns 204 No Content — standard REST for successful delete.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Returns 204 No Content
  @ApiOperation({ summary: 'Soft delete a product' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
