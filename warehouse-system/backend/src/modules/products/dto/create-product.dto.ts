/**
 * FILE: src/modules/products/dto/create-product.dto.ts
 * PURPOSE: Validates and types the request body when creating a product.
 *
 * CONCEPT — DTO (Data Transfer Object):
 * ─────────────────────────────────────────────────────────────
 * A DTO defines the SHAPE and RULES of incoming data.
 * It acts as a contract between the client and the API.
 *
 * class-validator decorators (@IsString, @IsNumber, etc.) run
 * automatically when ValidationPipe is configured in main.ts.
 * If validation fails → 400 Bad Request is returned automatically.
 *
 * WHY THIS MATTERS FOR TESTING:
 * - API tests can verify validation rules are enforced
 * - Negative test cases: send invalid data, expect 400 responses
 * - AI test generation can use DTO rules to generate valid/invalid payloads
 * ─────────────────────────────────────────────────────────────
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsPositive,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../entities/product.entity';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  sku: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional() // Optional field — not required in request body
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number) // Transform string to number (from JSON body)
  price: number;

  @IsNumber()
  @Min(0) // quantity can be 0 (out of stock), but not negative
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}
