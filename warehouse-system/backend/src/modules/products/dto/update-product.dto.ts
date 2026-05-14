/**
 * FILE: src/modules/products/dto/update-product.dto.ts
 * PURPOSE: Validates request body for partial product updates (PATCH).
 *
 * PartialType(CreateProductDto) → makes ALL fields from CreateProductDto optional.
 * This is the NestJS way to implement PATCH semantics:
 * the client can send only the fields they want to update.
 *
 * This avoids code duplication — we don't rewrite all the validators.
 */

import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
