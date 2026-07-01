import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { InventoryMovementType } from '../../common/enums/financial.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsUuidLike } from '../../common/decorators/is-uuid-like.decorator';

export class CreateInventoryProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  minStock?: number;

  @IsUuidLike()
  laundryId: string;
}

export class UpdateInventoryProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsUuidLike()
  laundryId?: string;
}

export class CreateInventoryMovementDto {
  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class InventoryFilterDto extends PaginationDto {
  @IsOptional()
  @IsUuidLike()
  laundryId?: string;

  @IsOptional()
  @Type(() => Boolean)
  lowStockOnly?: boolean;
}
