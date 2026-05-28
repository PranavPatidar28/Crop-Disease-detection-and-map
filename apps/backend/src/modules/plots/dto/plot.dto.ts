import {
  IsArray,
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlotDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cropTypes?: string[];

  @IsOptional()
  @IsNumber()
  areaAcres?: number;
}

export class UpdatePlotDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cropTypes?: string[];

  @IsOptional()
  @IsNumber()
  areaAcres?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
