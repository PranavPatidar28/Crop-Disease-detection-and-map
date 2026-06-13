import type { Severity } from '@prisma/client';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReportDto {
  /**
   * Optional client-side idempotency key (uuid). When the same userId+clientId
   * is posted twice, the existing report is returned instead of creating a
   * duplicate. Used by the offline upload queue to safely retry.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  cropType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  imageUrl!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  imagePublicId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  // --- Pre-computed diagnosis (from the capture→review flow) ---

  /** Diagnosed disease name. Present when the client already ran analysis. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  disease?: string;

  /** 0-100 confidence. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  severity?: Severity;

  /** Full farmer-facing advisory JSON (stored verbatim in the advisory column). */
  @IsOptional()
  @IsObject()
  advisory?: Record<string, unknown>;

  /**
   * Which engine produced the diagnosis. `cloud` results are trusted and stored
   * as SUCCESS without re-running HF; `on-device`/`manual` are provisional and
   * get upgraded by the processor.
   */
  @IsOptional()
  @IsIn(['cloud', 'on-device', 'manual'])
  engine?: 'cloud' | 'on-device' | 'manual';
}
