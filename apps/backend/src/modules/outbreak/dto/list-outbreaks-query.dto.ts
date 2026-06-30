import { Severity } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListOutbreaksQueryDto {
  // NOTE: do NOT use @Type(() => Boolean) — it runs Boolean(value), so the
  // query string "false" coerces to `true` and inactive zones can never be
  // queried. Transform the literal explicitly instead.
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
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
  @IsISO8601()
  since?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 200;
}
