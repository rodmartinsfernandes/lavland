import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  CardType,
  PaymentMethod,
  RevenueSource,
} from '../../common/enums/financial.enum';
import { IsUuidLike } from '../../common/decorators/is-uuid-like.decorator';

export class CreateRevenueDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsEnum(CardType)
  cardType?: CardType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installments?: number;

  @IsEnum(RevenueSource)
  source: RevenueSource;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsUuidLike()
  laundryId: string;
}

export class UpdateRevenueDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(CardType)
  cardType?: CardType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installments?: number;

  @IsOptional()
  @IsEnum(RevenueSource)
  source?: RevenueSource;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUuidLike()
  laundryId?: string;
}

export class RevenueFilterDto {
  @IsOptional()
  @IsUuidLike()
  laundryId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(RevenueSource)
  source?: RevenueSource;
}
