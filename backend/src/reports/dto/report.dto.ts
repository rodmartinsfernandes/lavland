import { IsDateString, IsOptional } from 'class-validator';
import { IsUuidLike } from '../../common/decorators/is-uuid-like.decorator';

export class ReportFilterDto {
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
