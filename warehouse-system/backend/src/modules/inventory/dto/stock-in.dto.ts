/**
 * FILE: src/modules/inventory/dto/stock-in.dto.ts
 * PURPOSE: Validates request body when receiving stock (nhập kho).
 */

import {
  IsUUID,
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class StockInDto {
  @IsUUID()
  productId: string; // Which product to receive

  @IsInt()
  @IsPositive() // Must be > 0 — cannot receive 0 or negative quantity
  quantity: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string; // e.g., Purchase Order number "PO-2026-001"

  @IsString()
  @IsOptional()
  note?: string; // e.g., "Received from supplier ABC"
}
