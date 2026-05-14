/**
 * FILE: src/modules/inventory/dto/adjust-stock.dto.ts
 * PURPOSE: Validates manual stock adjustment (điều chỉnh tồn kho).
 *
 * WHEN IS ADJUSTMENT USED?
 * ─────────────────────────────────────────────────────────────
 * - Physical stocktake reveals discrepancy (e.g., actual = 45, system = 50)
 * - Damaged goods removed from stock
 * - Data entry correction
 *
 * Adjustment sets stock to an ABSOLUTE value (not relative +/-).
 * e.g., "Set stock to 45" not "subtract 5"
 * ─────────────────────────────────────────────────────────────
 */

import { IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';

export class AdjustStockDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(0) // New quantity can be 0 (fully out of stock after adjustment)
  newQuantity: number; // The ABSOLUTE new stock level to set

  @IsString()
  @IsOptional()
  note?: string; // REQUIRED in real systems — reason for adjustment
}
