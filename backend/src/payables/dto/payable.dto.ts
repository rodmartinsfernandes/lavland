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
  Max,
  Min,
} from 'class-validator';
import {
  PayableStatus,
  PaymentMethod,
  RecurrenceInterval,
} from '../../common/enums/financial.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsUuidLike } from '../../common/decorators/is-uuid-like.decorator';

export class CreatePayableDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsUuidLike()
  laundryId: string;
}

export class CreateRecurringPayableDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsDateString()
  firstDueDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(120)
  installments: number;

  @IsOptional()
  @IsEnum(RecurrenceInterval)
  interval?: RecurrenceInterval;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsUuidLike()
  laundryId: string;
}

export class UpdatePayableDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUuidLike()
  laundryId?: string;
}

export class MarkPayablePaidDto {
  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class PayableFilterDto extends PaginationDto {
  @IsOptional()
  @IsUuidLike()
  laundryId?: string;

  @IsOptional()
  @IsEnum(PayableStatus)
  status?: PayableStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
