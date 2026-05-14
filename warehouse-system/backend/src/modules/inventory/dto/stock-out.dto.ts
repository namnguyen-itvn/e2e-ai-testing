/**
 * FILE: src/modules/inventory/dto/stock-out.dto.ts
 * PURPOSE: Validates request body when issuing stock (xuất kho).
 */

import {
  IsUUID,
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class StockOutDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number; // Must be > 0 and <= currentQuantity (checked in service)

  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string; // e.g., Sales Order number "SO-2026-001"

  @IsString()
  @IsOptional()
  note?: string; // e.g., "Shipped to customer XYZ"
}
