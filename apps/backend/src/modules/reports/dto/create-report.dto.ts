import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
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
}
