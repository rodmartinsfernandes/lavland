import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { IsUuidLike } from '../../common/decorators/is-uuid-like.decorator';

export class ImportRevenueDto {
  @IsUuidLike()
  laundryId: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  replaceExisting?: boolean;
}
