import { Severity } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListOutbreaksQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active: boolean = true;

  @IsOptional()
  @IsString()
  disease?: string;

  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  /** Reports created on or after this ISO timestamp. Default: 30d ago. */
  @IsOptional()
  @IsString()
  since?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 200;
}
