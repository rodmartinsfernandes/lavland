import { Type } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class DateFilterDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export function buildDateRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return undefined;
  }

  const range: { gte?: Date; lte?: Date } = {};

  if (startDate) {
    range.gte = new Date(startDate);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }

  return range;
}
