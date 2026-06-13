import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  cropTypes?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
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
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  cropTypes?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  areaAcres?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
