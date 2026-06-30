import { Severity } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class NearbyReportsQueryDto {
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  /** Search radius in km. Default 50, max 1000. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  radiusKm: number = 50;

  /** Hard cap. Default 200, max 500. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 200;

  /** Filter by disease name (exact match). */
  @IsOptional()
  @IsString()
  disease?: string;

  /** Filter by crop type (exact match). */
  @IsOptional()
  @IsString()
  cropType?: string;

  /** Filter by severity. */
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  /** Reports created on or after this ISO timestamp. */
  @IsOptional()
  @IsISO8601()
  since?: string;
}
