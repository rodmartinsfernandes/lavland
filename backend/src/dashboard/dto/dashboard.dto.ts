import { IsDateString, IsOptional } from 'class-validator';
import { IsUuidLike } from '../../common/decorators/is-uuid-like.decorator';

export class DashboardFilterDto {
  @IsOptional()
  @IsUuidLike()
  laundryId?: string;
}

export class RevenueProjectionFilterDto {
  @IsOptional()
  @IsUuidLike()
  laundryId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
