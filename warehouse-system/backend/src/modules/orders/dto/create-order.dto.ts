import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsEmail,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '../entities/order.entity';

export class CreateOrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @IsEnum(OrderType)
  type: OrderType;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  partnerName?: string;

  @IsEmail()
  @IsOptional()
  partnerEmail?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  /**
   * @ValidateNested({ each: true }) → validate each item in the array.
   * @Type(() => CreateOrderItemDto) → transform plain objects to class instances.
   * Both decorators are required together for nested validation.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
