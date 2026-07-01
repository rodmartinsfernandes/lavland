import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export function resolvePagination(source?: {
  page?: number | string;
  limit?: number | string;
}) {
  const page = Math.max(1, Number(source?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(source?.limit) || 20));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}
