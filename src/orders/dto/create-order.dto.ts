import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLineDto {
  @IsMongoId()
  productId: string;

  @IsNumber()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @IsMongoId()
  customerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];

  @IsString()
  @IsOptional()
  note?: string;
}
