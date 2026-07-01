import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateLaundryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateLaundryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
