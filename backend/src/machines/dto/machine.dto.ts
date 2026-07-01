import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { MachineStatus, MachineType } from '../../common/enums/financial.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsUuidLike } from '../../common/decorators/is-uuid-like.decorator';

export class CreateMachineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MachineType)
  type: MachineType;

  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @IsString()
  brandModel?: string;

  @IsOptional()
  @IsDateString()
  acquiredAt?: string;

  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @IsUuidLike()
  laundryId: string;
}

export class UpdateMachineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(MachineType)
  type?: MachineType;

  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @IsString()
  brandModel?: string;

  @IsOptional()
  @IsDateString()
  acquiredAt?: string;

  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @IsOptional()
  @IsUuidLike()
  laundryId?: string;
}

export class MachineFilterDto extends PaginationDto {
  @IsOptional()
  @IsUuidLike()
  laundryId?: string;

  @IsOptional()
  @IsEnum(MachineType)
  type?: MachineType;

  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;
}
