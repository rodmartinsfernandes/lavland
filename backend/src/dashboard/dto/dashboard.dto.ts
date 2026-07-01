import { IsOptional } from 'class-validator';
import { IsUuidLike } from '../../common/decorators/is-uuid-like.decorator';

export class DashboardFilterDto {
  @IsOptional()
  @IsUuidLike()
  laundryId?: string;
}
